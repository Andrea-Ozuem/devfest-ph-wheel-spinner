# Features Documentation

## Admin Session Control

### Overview

The Admin Session Control page provides admins with a dedicated interface to manage and control raffle sessions in real-time. This is where admins can spin the wheel, manage participants, and view live session data.

### Accessing the Feature

1. **Login as Admin**: Navigate to `/auth` and sign in with admin credentials
2. **Go to Admin Dashboard**: Click "Admin Dashboard" button on the homepage
3. **Open a Session**: In the sessions table, click the **Play button** (▶️) to open the session control page
4. **Alternative**: Directly navigate to `/admin/session/{sessionId}`

### Session Control Page Layout

The page is divided into three main sections:

#### Header Section

- **Back Button**: Returns to admin dashboard
- **Session Name**: Displays the raffle session name
- **Prize Info**: Shows the prize for this session
- **Session Code**: 6-character code participants use to join

#### Main Content (Left Side - 2/3 width on desktop)

**Participant Counter**

- Real-time count of active participants
- Updates instantly as new participants join

**Wheel Display**

- Interactive SVG wheel with participant segments
- Color-coded segments for better visibility
- Smooth rotation animation when spinning
- Displays participant names on segments

**Spin Controls**

- Large "Spin the Wheel!" button
- Disabled when spinning or no participants available
- Shows "Spinning..." status during animation

**Winner Announcement**

- Displays winner name with celebratory styling
- 🎉 Emoji animations
- Auto-clears after 3 seconds

#### Participant List (Right Side - 1/3 width on desktop)

**Live Participant Table**

- Shows all current participants
- Ordered by join time (earliest first)
- **Name Column**: Participant name
- **Action Column**: Delete button for each participant

**Participant Count**

- Header shows total participant count
- Updates in real-time as participants join/leave

### Features & Functionality

#### 1. **Real-Time Participant Updates**

- Participants joining the session appear instantly
- Uses Firestore real-time listeners for live updates
- No need to refresh the page
- Automatic participant removal after winning

#### 2. **Spin the Wheel**

- Click "Spin the Wheel!" button to initiate spin
- Wheel rotates smoothly for 4 seconds
- Random participant is selected
- Winner is announced with confetti animation
- Winner is automatically removed from participants

**What Happens When You Spin:**

1. Button becomes disabled
2. Wheel rotates with animation
3. Winner is randomly selected
4. Confetti animation plays (3 seconds)
5. Winner name is displayed prominently
6. Draw is recorded in Firestore
7. Winner is removed from participant list
8. You can immediately spin again

#### 3. **Participant Management**

**Remove Participant Manually**

- Click the trash icon next to any participant
- Confirmation dialog appears
- Click "Remove" to confirm
- Participant is immediately removed from the wheel

**View Participants**

- Scroll through the participant list on the right
- See participant names and join order
- Real-time updates as new participants join

#### 4. **Wheel Visualization**

- Segments are color-coded (alternating purple and blue shades)
- Each segment represents one participant
- Names are rotated to align with segments
- Long names are truncated with "..." for readability
- Center circle indicates the spin pointer

#### 5. **Data Recording**

- Each draw is recorded in Firestore with:
  - Session ID
  - Winner name
  - Timestamp
  - Re-spin flag
  - Random seed

### Empty State

If no participants have joined yet:

- Wheel shows "No participants yet" message
- Spin button is disabled
- Participant list shows "Waiting for participants..."
- Share the session code or QR code with attendees

### Mobile Responsiveness

**On Smaller Screens:**

- Layout switches to single column
- Participant list moves below the wheel
- All controls remain fully functional
- Touch-friendly button sizes

### Keyboard & Accessibility

- Back button uses standard navigation
- Buttons are tab-navigable
- Alert dialogs have proper focus management
- Toast notifications announce actions

### Error Handling

**If Session Not Found:**

- Page displays "Session not found"
- User is redirected to admin dashboard
- Error toast is shown

**If Load Fails:**

- Error message displayed
- Toast notification shows failure reason
- User can navigate back to admin dashboard

**During Spin:**

- If no participants: Toast shows "No participants to spin for!"
- Button remains enabled for retry

### Common Tasks

#### How to Spin and Select a Winner

1. Ensure participants have joined (check right panel)
2. Click "Spin the Wheel!" button
3. Watch the wheel rotate
4. Winner is announced with celebration
5. Click "Spin the Wheel!" again for next round

#### How to Remove a Participant

1. Find the participant in the right panel
2. Click the trash icon in their row
3. Confirm removal in the dialog
4. Participant is removed from the wheel

#### How to Go Back to Admin Dashboard

1. Click the back arrow button in the top-left
2. You'll be returned to the admin dashboard
3. Session remains active for other users

#### How to Share Session with Participants

1. Click the back button to return to admin dashboard
2. Click the "eye" icon on the session row to view QR code
3. Share the QR code or the 6-character code with participants

### Data Flow

```
Admin Opens Session
    ↓
AdminSessionControl Page Loads
    ↓
Fetches Session Data from Firestore
    ↓
Sets Up Real-Time Listener for Participants
    ↓
Displays Wheel & Participant List
    ↓
Participants Can Join in Real-Time (visible immediately)
    ↓
Admin Clicks "Spin the Wheel!"
    ↓
Random Winner Selected
    ↓
Draw Recorded in Firestore
    ↓
Winner Removed from Participants
    ↓
Ready to Spin Again
```

### Related Features

- **Admin Dashboard** (`/admin`): Create sessions, manage sessions, view participant counts
- **Home Page** (`/`): Public view of the wheel and join functionality
- **Join Session Modal**: Participants use this to join by entering code or scanning QR
- **History Page** (`/history`): View past draws and results

### Technical Details

**Component**: `AdminSessionControl.tsx`

- Path: `/src/pages/AdminSessionControl.tsx`
- Route: `/admin/session/:sessionId`
- Auth: Admin only
- Real-Time: Firestore listeners

**Dependencies**:

- `WheelSpinner`: Renders the interactive wheel
- `Confetti`: Celebration animation
- Firestore: Database operations
- React Router: Navigation

**State Management**:

- `session`: Current session data
- `participants`: Real-time participant list
- `isSpinning`: Spin animation state
- `winner`: Currently announced winner
- `showConfetti`: Confetti animation toggle
- `participantToRemove`: Confirmation dialog state
