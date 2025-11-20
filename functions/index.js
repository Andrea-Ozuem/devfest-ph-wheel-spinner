/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const logger = require("firebase-functions/logger");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

exports.spinWheel = onCall(async (request) => {
  try {
    console.log("Spin wheel called");
    const { sessionId } = request.data;

    if (!sessionId) {
      throw new HttpsError("invalid-argument", "Session ID is required");
    }

    const participantsSnapshot = await admin
      .firestore()
      .collection("participants")
      .where("session_id", "==", sessionId)
      .orderBy("joined_at", "asc")
      .get();

    if (participantsSnapshot.empty) {
      throw new HttpsError("failed-precondition", "No participants found");
    }

    const participants = participantsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[winnerIndex];

    // Calculate physics-based rotation
    const segmentAngle = 360 / participants.length;
    const baseRotations = 5; // 5 full spins
    
    // Calculate winner's segment CENTER (where text is displayed)
    const winnerSegmentCenter = winnerIndex * segmentAngle + (segmentAngle / 2);
    const targetAngle = 360 - winnerSegmentCenter;
    const finalRotation = baseRotations * 360 + targetAngle;

    // Generate random spin duration (4 to 5.5 seconds)
    const baseDuration = 4;
    const durationVariation = Math.random() * 1.5; // 0 to 1.5 seconds
    const duration = baseDuration + durationVariation;

    logger.log(`Winner selected: ${winner.name}, Duration: ${Math.round(duration * 100) / 100}s`);

    const spinStateRef = admin
    .firestore()
    .collection('sessions')
    .doc(sessionId)
    .collection('spin_state')
    .doc('current');

    // Write spin data to Firestore
    await spinStateRef.set({
      isSpinning: true,
      winner: {
        id: winner.id,
        participant_id: winner.participant_id,
        name: winner.name,
        verification_code: winner.verification_code
      },
      rotation: finalRotation,
      duration: duration,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      participantCount: participants.length,
      spinId: crypto.randomUUID() // Unique ID for this spin
    });

    logger.log(`Spin state written to Firestore for session: ${sessionId}`);

    const spinData = {
      winner: {
        id: winner.id,
        participant_id: winner.participant_id,
        name: winner.name,
        verification_code: winner.verification_code
      },
      rotation: finalRotation,
      duration: Math.round(duration * 100) / 100,
      timestamp: Date.now(),
      participantCount: participants.length
    };

    return spinData;
  } catch (error) {
    logger.error("Error in spinWheel function:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});
