import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const expireCheckReservations = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const now = new Date().toISOString();
    const snap = await db
      .collection("checkReservations")
      .where("status", "==", "pending")
      .where("expiresAt", "<=", now)
      .get();

    const batch = db.batch();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      batch.update(docSnap.ref, { status: "expired" });
      const isSponsorship = data.sponsorshipId !== "donation" &&
                            data.sponsorshipId !== "individual" &&
                            data.sponsorshipId !== "foursome" &&
                            data.sponsorshipId !== "cocktail";
      if (isSponsorship) {
        const sponsorRef = db.collection("sponsorships").doc(data.sponsorshipId);
        batch.update(sponsorRef, {
          reservedCount: admin.firestore.FieldValue.increment(-1),
        });
      }
    }
    await batch.commit();
    console.log(`Expired ${snap.docs.length} reservations.`);
  });
