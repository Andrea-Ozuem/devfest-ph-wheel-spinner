# Real-Time Raffle Implementation Flow

## Architecture Overview

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Admin     │         │  Firebase Cloud  │         │  Supabase   │
│   Client    │────1───>│    Function      │────4───>│  Realtime   │
│  (Browser)  │<───6────│   (Backend)      │         │  Channel    │
└─────────────┘         └──────────────────┘         └─────────────┘
                                │                            │
                                │2                           │5
                                ↓                            ↓
                        ┌──────────────────┐         ┌─────────────┐
                        │    Firestore     │         │   Public    │
                        │    Database      │         │   Clients   │
                        └──────────────────┘         │  (Browsers) │
                                ↑                    └─────────────┘
                                │3                          │
                                └───────────────────────────┘7
```

---

## Detailed Flow: Step-by-Step

### STEP 1: Admin Initiates Spin

**Tool**: React Frontend (AdminSessionControl.tsx)

```typescript
// Admin clicks "Spin" button
const handleSpin = async () => {
  setIsSpinning(true);

  // Call Firebase Cloud Function
  const spinWheel = httpsCallable(functions, "spinWheel");
  const result = await spinWheel({
    sessionId: "abc123",
  });

  // result contains winner info for admin's local state
};
```

**What happens**:

- Button click triggers HTTPS request to backend
- Firebase SDK automatically includes auth token
- Request goes to Cloud Function

---

### STEP 2: Backend Fetches Participants

**Tool**: Firebase Cloud Function + Firestore

```typescript
// functions/src/index.ts
export const spinWheel = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;

  // Verify admin is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be admin");
  }

  // Check cooldown (query last spin from spin_history)
  const lastSpinSnapshot = await admin
    .firestore()
    .collection("spin_history")
    .where("session_id", "==", sessionId)
    .orderBy("spun_at", "desc")
    .limit(1)
    .get();

  if (!lastSpinSnapshot.empty) {
    const lastSpin = lastSpinSnapshot.docs[0].data();
    const timeSinceLastSpin = Date.now() - lastSpin.spun_at.toMillis();

    if (timeSinceLastSpin < 30000) {
      // 30 seconds
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cooldown active. Wait 30 seconds."
      );
    }
  }

  // FETCH ALL PARTICIPANTS
  const participantsSnapshot = await admin
    .firestore()
    .collection("participants")
    .where("session_id", "==", sessionId)
    .get();

  const participants = participantsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (participants.length === 0) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No participants"
    );
  }

  // Continue to Step 3...
});
```

**What happens**:

- Backend verifies admin auth token
- Checks cooldown timer (prevents spam)
- Fetches all participants from Firestore
- Validates there are participants

---

### STEP 3: Backend Selects Winner

**Tool**: Firebase Cloud Function (Physics Algorithm)

```typescript
// ... continued from Step 2

// SELECT WINNER (server-side random)
const winnerIndex = Math.floor(Math.random() * participants.length);
const winner = participants[winnerIndex];

// Calculate physics-based rotation
const segmentAngle = 360 / participants.length;
const baseRotations = 5; // 5 full spins
const targetSegmentAngle = segmentAngle * winnerIndex;
const finalRotation = baseRotations * 360 + (360 - targetSegmentAngle);

const spinData = {
  winner: {
    id: winner.id,
    name: winner.name,
  },
  rotation: finalRotation,
  timestamp: Date.now(),
  participantCount: participants.length,
};

// Continue to Step 4...
```

**What happens**:

- Cryptographically secure random selection
- Calculate exact rotation angle for wheel animation
- Package data for broadcast

---

### STEP 4: Backend Broadcasts to Supabase

**Tool**: Supabase Realtime (from Firebase Cloud Function)

```typescript
// ... continued from Step 3

// Initialize Supabase client in Cloud Function
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  functions.config().supabase.url,
  functions.config().supabase.key
);

// BROADCAST TO ALL CLIENTS
await supabase.channel(`session:${sessionId}`).send({
  type: "broadcast",
  event: "spin_completed",
  payload: spinData,
});

// Continue to Step 5...
```

**What happens**:

- Backend connects to Supabase Realtime channel
- Sends broadcast message with winner + rotation
- Supabase distributes to ALL subscribed clients instantly (~50ms)

---

### STEP 5: Supabase Delivers to All Clients

**Tool**: Supabase Realtime WebSocket

```
Supabase Server
    ↓ (WebSocket)
    ├─> Admin Client (receives winner)
    ├─> Public Client 1 (receives winner)
    ├─> Public Client 2 (receives winner)
    ├─> Public Client 3 (receives winner)
    └─> Public Client N (receives winner)
```

**What happens**:

- All clients have WebSocket connection to Supabase channel
- Supabase pushes message to every connected client
- Happens in parallel (not sequential)
- Clients receive identical payload

---

### STEP 6: Backend Saves to History

**Tool**: Firebase Cloud Function + Firestore

```typescript
// ... continued from Step 4

  // SAVE TO HISTORY (for records)
  await admin.firestore()
    .collection('spin_history')
    .add({
      session_id: sessionId,
      winner_id: winner.id,
      winner_name: winner.name,
      participant_count: participants.length,
      spun_at: admin.firestore.FieldValue.serverTimestamp(),
      spun_by_admin: context.auth.uid
    });

  // Return result to admin client
  return spinData;
});
```

**What happens**:

- Record saved to Firestore for history page
- Includes timestamp, winner, participant count
- Used for cooldown check in future spins
- Admin receives confirmation response

---

### STEP 7: All Clients Animate

**Tool**: React Frontend (Index.tsx + AdminSessionControl.tsx)

```typescript
// In both admin and public clients
useEffect(() => {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // SUBSCRIBE TO BROADCAST
  const channel = supabase
    .channel(`session:${sessionId}`)
    .on("broadcast", { event: "spin_completed" }, (payload) => {
      const { winner, rotation, timestamp } = payload.payload;

      // Update local state
      setWinner(winner.name);
      setFinalRotation(rotation);
      setIsSpinning(true);

      // WheelSpinner component animates to rotation angle
      // After 4 seconds, show confetti + winner announcement
    })
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [sessionId]);
```

**What happens**:

- All clients receive identical broadcast payload
- Each client triggers wheel animation to same rotation
- Winner announcement shows after animation
- Confetti triggers simultaneously on all screens

---

## Tool Responsibility Matrix

| Step  | Tool                    | Responsibility                                        |
| ----- | ----------------------- | ----------------------------------------------------- |
| **1** | React Frontend          | Capture admin click, call backend                     |
| **2** | Firebase Cloud Function | Auth verification, cooldown check, fetch participants |
| **3** | Firebase Cloud Function | Random selection, calculate rotation                  |
| **4** | Supabase Realtime       | Broadcast winner to all clients                       |
| **5** | Supabase WebSocket      | Deliver message to every connected client             |
| **6** | Firestore               | Save spin to history, enable cooldown                 |
| **7** | React Frontend          | Animate wheel, show winner, confetti                  |

---

## Data Flow Timeline

```
Time  | Event
------|--------------------------------------------------------
T+0ms | Admin clicks "Spin"
T+50  | Request reaches Firebase Cloud Function
T+100 | Backend fetches 200 participants from Firestore
T+150 | Backend selects winner (participant #137)
T+200 | Backend broadcasts to Supabase channel
T+250 | All 500 clients receive broadcast (parallel)
T+300 | Clients start 4-second wheel animation
T+4300| Winner announcement shows on all screens
T+4500| Confetti triggers everywhere
```

---

## Why This Architecture Works

✅ **Security**: Winner selected server-side (cannot manipulate)  
✅ **Fairness**: Single source of truth (all clients see same result)  
✅ **Speed**: Supabase broadcasts in 50-100ms  
✅ **Sync**: All clients animate simultaneously  
✅ **Scale**: Handles 500+ concurrent users  
✅ **Cost**: Firebase + Supabase free tiers sufficient

---

## Tech Stack Summary

### Frontend

- **React + TypeScript**: UI components
- **Firebase SDK**: Call Cloud Functions, auth
- **Supabase Client**: Subscribe to real-time broadcasts

### Backend

- **Firebase Cloud Functions**: Spin logic, winner selection
- **Firestore**: Participant storage, spin history
- **Supabase Realtime**: WebSocket broadcasting

### Infrastructure

- **Firebase Hosting**: Deploy frontend
- **Firebase Auth**: Admin authentication
- **Supabase**: Real-time messaging layer
