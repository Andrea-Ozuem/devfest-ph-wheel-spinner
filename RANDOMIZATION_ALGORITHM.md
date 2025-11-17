# Randomization Algorithm

## Overview

This document describes the simple true-random physics-based wheel spinner algorithm used in DevFest Wheel Spinner.

## Key Principles

1. **Cryptographically Secure Randomness** - Uses Web Crypto API (`crypto.getRandomValues()`)`
2. **Physics-Based Selection** - Winner is determined by calculating where the wheel will stop
3. **True Randomness** - Every spin generates a unique random seed and unpredictable result
4. **Fair Distribution** - Each participant has equal probability of winning (1/n where n = participant count)

## Algorithm Steps

### 1. Participant Selection (Random)

```txt
Input: Array of participants
Process:
  1. Use crypto-secure random to select index: 0 to (participant_count - 1)
  2. Return participant at that index
Output: Randomly selected participant
```

### 2. Physics-Based Spin Calculation

```txt
Input: Participant count, Selected winner index
Process:
  1. Calculate segment angle = 360° / participant_count
  2. Calculate winner's segment center angle
  3. Calculate target rotation angle:
     - The pointer is at top (0°)
     - Rotate wheel so winner's segment center aligns with pointer
     - target_angle = 360° - winner_segment_center
  4. Add multiple full rotations (3-5 random rotations) for visual effect
     - final_rotation = (random_rotations × 360°) + target_angle
  5. Generate random spin duration (3.5 to 5 seconds) for variation
Output: Final rotation angle, Duration
```

### 3. Visual Animation

```txt
Input: Final rotation angle, Duration
Process:
  1. Animate wheel rotation from 0° to final_rotation° over duration
  2. Use easing function for realistic deceleration
  3. Winner's segment reaches the pointer when animation completes
Output: Visible spinning wheel, Winner at pointer position
```

### 4. Winner Announcement

```txt
Input: Selected winner, Final position
Process:
  1. Show confetti animation
  2. Display winner name
  3. Record draw to Firestore with:
     - Winner name
     - Timestamp
     - Session ID
  4. Remove winner from participants
  5. Clear animation states
Output: Winner announced, Data persisted
```

## Example

````txt
Scenario: 4 participants [Alice, Bob, Charlie, Diana]
         each at 90° segments (0-90°, 90-180°, 180-270°, 270-360°)

Random Selection:
  - Random index: 2 (Charlie)

Wheel Physics:
  - Segment angle: 360° / 4 = 90°
  - Charlie's segment center: 2 × 90° + 45° = 225°
  - Target angle: 360° - 225° = 135°
  - Random rotations: 4
  - Final rotation: (4 × 360°) + 135° = 1575°
  - Random duration: 4.2 seconds

Animation:
  - Wheel rotates from 0° to 1575° over 4.2 seconds
  - Charlie's segment reaches the pointer

Result:
  - Winner: Charlie
  - Time logged: [timestamp]
```

## Security Properties

- ✅ **True Randomness**: Uses Web Crypto API, not pseudo-random
- ✅ **Non-Deterministic**: Cannot predict result before spin completes
- ✅ **Fair Distribution**: Uniform probability for all participants
- ✅ **Audit Trail**: Timestamp stored for logging
- ✅ **No Pre-Determination**: Winner selected at spin time, not beforehand

## Implementation Details

### Crypto-Secure Random Functions

```typescript
getSecureRandomInt(min, max); // Random integer in range
getSecureRandom(); // Random float 0-1
getRandomParticipant(array); // Random array element
calculatePhysicsBasedSpin(count); // Complete spin calculation
````

### Firestore Recording

Each draw is recorded with:

```json
{
  "session_id": "abc123",
  "winner_name": "Charlie",
  "timestamp": "2025-11-14T10:30:00Z",
  "is_re_spin": false
}
```

## Why This Approach?

| Aspect                | Benefit                                                       |
| --------------------- | ------------------------------------------------------------- |
| Web Crypto API        | More random than `Math.random()`, OS-level entropy            |
| Physics-Based         | Winner position determined by wheel, not pre-selected         |
| Timestamp Recording   | Simple audit trail with timestamp                             |
| Simple Implementation | Easier to understand and maintain than complex crypto schemes |

## Limitations

- ❌ Not cryptographically verifiable (can't prove fairness to external parties)
- ❌ Still requires trusting the application code
- ❌ No way to independently verify randomness after the fact

**For auditable/verifiable raffles**, consider implementing a Client-seed + Server-seed system with cryptographic commitments.
