# Real-time Spin Synchronization Implementation

## Overview
This document outlines the implementation of real-time spin state synchronization across all connected clients (admin and public users) using Firebase Firestore real-time listeners.

## Problem Statement
Currently, when the admin clicks "Spin", only the admin sees the wheel animation. Public users see participant updates but not the spinning animation or synchronized winner reveal.

## Solution Architecture

### Industry Standard Pattern: Real-time State Broadcasting
- **Pattern**: Single Source of Truth + Real-time Listeners
- **Technology**: Firestore `onSnapshot()` with WebSocket connections
- **Used by**: Kahoot, Mentimeter, Slido, Google Docs, Figma
- **Latency**: Typical <100ms propagation time

### High-Level Flow
```
Admin Clicks "Spin"
    ↓
Cloud Function (spinWheel)
    ↓
Writes to Firestore: sessions/{sessionId}/spin_state
    ↓
Firestore Broadcasts via WebSocket
    ↓
All Clients (Admin + Public) onSnapshot listeners fire
    ↓
All Wheels Spin Simultaneously
    ↓
All Show Winner at Same Time
```

## Firestore Data Structure

### New Document: `spin_state` (subcollection of sessions)
```typescript
sessions/{sessionId}/spin_state/current
{
  isSpinning: boolean,        // true during spin, false when idle
  winner: {
    id: string,               // Participant ID
    name: string              // Participant name
  } | null,
  rotation: number,           // Final rotation in degrees (e.g., 2160)
  duration: number,           // Animation duration in seconds (e.g., 4.5)
  timestamp: number,          // Server timestamp for sync verification
  participantCount: number,   // Number of participants at spin time
  spinId: string              // Unique spin ID (UUID) to prevent stale updates
}
```

### Why Subcollection vs Top-Level Field?
- ✅ Separate security rules for spin state
- ✅ Easier to listen to just spin events
- ✅ Scales better (won't hit document size limits)
- ✅ Clean separation of concerns

### Alternative Considered: Top-level field in session document
```typescript
sessions/{sessionId}
{
  name: string,
  code: string,
  active: boolean,
  current_spin: { ... }  // ❌ Couples spin state with session metadata
}
```
**Rejected because:**
- Mixes concerns (session config + ephemeral spin state)
- Harder to secure (different read/write permissions)
- Clutters session document

## Implementation Steps

### 1. Cloud Function Updates (`functions/index.js`)
```javascript
// After calculating spin data, write to Firestore
const spinStateRef = admin
  .firestore()
  .collection('sessions')
  .doc(sessionId)
  .collection('spin_state')
  .doc('current');

await spinStateRef.set({
  isSpinning: true,
  winner: {
    id: winner.id,
    name: winner.name
  },
  rotation: finalRotation,
  duration: duration,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  participantCount: participants.length,
  spinId: crypto.randomUUID()
});

// Return the same data to admin (for immediate UI update)
return spinData;
```

### 2. Admin Component (`src/pages/AdminSessionControl.tsx`)

**Add real-time listener:**
```typescript
useEffect(() => {
  if (!sessionId) return;

  const spinStateRef = doc(db, "sessions", sessionId, "spin_state", "current");
  
  const unsubscribe = onSnapshot(spinStateRef, (snapshot) => {
    if (snapshot.exists()) {
      const spinData = snapshot.data();
      
      // Update local state from Firestore
      setIsSpinning(spinData.isSpinning);
      setWinner(spinData.winner?.name || null);
      setWinnerParticipant(spinData.winner);
      setSpinDuration(spinData.duration);
      setFinalRotation(spinData.rotation);
      
      // Trigger winner announcement after spin duration
      if (spinData.isSpinning) {
        setTimeout(() => {
          setShowConfetti(true);
          setShowWinnerAnnouncement(true);
        }, spinData.duration * 1000 + 500);
      }
    }
  });

  return () => unsubscribe();
}, [sessionId]);
```

**Modify handleSpin:**
```typescript
const handleSpin = async () => {
  // Cloud function now writes to Firestore
  // onSnapshot listener will handle UI updates
  const result = await spinWheel({ sessionId: session.id });
  
  // Optional: Keep immediate feedback for admin
  // (listener will overwrite with Firestore data within ~100ms)
};
```

### 3. Public View Component (`src/pages/Index.tsx`)

**Add same real-time listener:**
```typescript
useEffect(() => {
  if (!activeSession) return;

  const spinStateRef = doc(db, "sessions", activeSession.id, "spin_state", "current");
  
  const unsubscribe = onSnapshot(spinStateRef, (snapshot) => {
    if (snapshot.exists()) {
      const spinData = snapshot.data();
      
      // Public users get same state as admin
      setIsSpinning(spinData.isSpinning);
      setWinner(spinData.winner?.name || null);
      setSpinDuration(spinData.duration);
      setFinalRotation(spinData.rotation);
      
      // Show winner after spin completes (read-only view)
      if (spinData.isSpinning) {
        setTimeout(() => {
          setShowConfetti(true);
          toast.success(`🎉 Winner: ${spinData.winner?.name}!`, {
            duration: 5000
          });
        }, spinData.duration * 1000 + 500);
      }
    }
  });

  return () => unsubscribe();
}, [activeSession]);
```

**Remove local handleSpin:**
- Public users never call this function
- Only admin can trigger spins

### 4. Wheel Component (`src/components/WheelSpinner.tsx`)
- **No changes needed!** 
- Already accepts `isSpinning`, `winner`, `rotation`, `duration` as props
- Will automatically animate when props change from Firestore

## Security Rules (firebase.json / Firestore Rules)

```javascript
// Allow all users to read spin state
match /sessions/{sessionId}/spin_state/{spinId} {
  allow read: if true;  // Public read for synchronized viewing
  allow write: if false; // Only cloud functions can write
}
```

**Why public read is safe:**
- Spin results are meant to be public (displayed on screen)
- No sensitive data (just participant names already visible)
- Write access restricted to cloud functions only

## Edge Cases & Handling

### 1. Late Joiners (User opens page mid-spin)
**Problem**: User joins when wheel is 50% through spin
**Solution**: Check `timestamp` and skip animation if too old
```typescript
const spinAge = Date.now() - spinData.timestamp;
if (spinAge > spinData.duration * 1000) {
  // Spin already finished, show final state immediately
  setIsSpinning(false);
  setWinner(spinData.winner?.name);
} else {
  // Start animation with remaining time
  const remainingDuration = spinData.duration - (spinAge / 1000);
  setSpinDuration(remainingDuration);
  setIsSpinning(true);
}
```

### 2. Network Disconnection
**Firestore handles automatically:**
- Queues updates while offline
- Replays missed updates on reconnection
- No additional code needed

### 3. Multiple Rapid Spins
**Problem**: Admin clicks "Spin" multiple times quickly
**Solution**: Use `spinId` to dedupe
```typescript
const [lastProcessedSpinId, setLastProcessedSpinId] = useState<string | null>(null);

onSnapshot(spinStateRef, (snapshot) => {
  const spinData = snapshot.data();
  if (spinData.spinId === lastProcessedSpinId) return; // Skip duplicate
  
  setLastProcessedSpinId(spinData.spinId);
  // Process spin...
});
```

### 4. Stale Winner Announcements
**Problem**: Winner dialog still showing when new spin starts
**Solution**: Reset state when new spin detected
```typescript
if (spinData.isSpinning && spinData.spinId !== currentSpinId) {
  setShowWinnerAnnouncement(false);
  setShowConfetti(false);
  // Start fresh spin
}
```

### 5. Cleanup After Spin Completes
**Option A**: Auto-cleanup in cloud function (timer-based)
```javascript
// After 10 seconds, reset spin state
setTimeout(async () => {
  await spinStateRef.update({ isSpinning: false });
}, 10000);
```

**Option B**: Admin confirms winner → cloud function resets
```javascript
// When admin clicks "Continue" on winner dialog
await httpsCallable(functions, 'resetSpinState')({
  sessionId: session.id
});
```

**Recommended**: Option B (explicit control)

## Performance Considerations

### Latency Breakdown
- Admin click → Cloud function: ~50-100ms
- Cloud function → Firestore write: ~50-100ms
- Firestore → Client propagation: ~50-100ms
- **Total latency**: ~150-300ms (sub-second)

### Firestore Costs
- **Reads**: 1 read per client per spin (minimal)
- **Writes**: 1 write per spin (negligible)
- **Listeners**: 1 active listener per connected client
- **Monthly free tier**: 50K reads, 20K writes, 1GB storage
- **Estimated cost**: <$1/month for 1000 spins with 50 concurrent viewers

### Optimization: Connection Pooling
- Firestore reuses WebSocket connections automatically
- No action needed

## Testing Plan

### Test Cases
1. ✅ Admin spins → All public users see animation
2. ✅ Multiple public users join → All see same spin state
3. ✅ Late joiner mid-spin → Shows current animation state
4. ✅ Network disconnect/reconnect → Catches up correctly
5. ✅ Admin closes winner dialog → State resets for next spin
6. ✅ Multiple rapid spins → Each spin completes independently

### Manual Testing Steps
```bash
# Terminal 1: Run app
npm run dev

# Terminal 2: Open admin in Chrome
open http://localhost:5173/admin

# Terminal 3: Open public view in Firefox
open -a Firefox http://localhost:5173/

# Terminal 4: Open public view in Safari
open -a Safari http://localhost:5173/

# Action: Click "Spin" in admin
# Expected: All 3 browsers show synchronized wheel spin
```

### Automated Testing (Future)
- Use Playwright for multi-browser sync testing
- Mock Firestore snapshot events
- Test latency with network throttling

## Rollback Plan

If issues arise:
1. Revert cloud function changes (remove Firestore write)
2. Remove `onSnapshot` listeners from components
3. Restore local state management
4. Deploy rollback (takes ~2 minutes with Firebase)

**Risk Level**: Low
- Non-breaking change (additive only)
- Fallback: Admin-only spin still works without Firestore sync
- Can be deployed incrementally (cloud function first, then clients)

## Success Metrics

- ✅ Sub-second latency (<500ms admin → public)
- ✅ Zero missed spin events (100% reliability)
- ✅ Synchronized winner reveal across all clients
- ✅ No UI jank or animation desync
- ✅ Works with 50+ concurrent viewers

## Future Enhancements

1. **Spin Progress Bar**: Show realtime progress % during spin
2. **Sound Sync**: Play tick sounds synchronized across clients
3. **Reconnection UI**: Show "Reconnecting..." indicator on network loss
4. **Admin Override**: Allow admin to cancel mid-spin
5. **Analytics**: Track spin latency and viewer count per spin

## References

- [Firestore Real-time Listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [React useEffect Cleanup](https://react.dev/reference/react/useEffect#cleanup-function)
- [Framer Motion Animation](https://www.framer.com/motion/animation/)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-17  
**Status**: Ready for Implementation  
**Estimated Implementation Time**: 2-3 hours
