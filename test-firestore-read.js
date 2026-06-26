const API_KEY = "AIzaSyB_P4dBvtrVhAnKHvvmlyKKn9iu_s3nnQo";
fetch(`https://firestore.googleapis.com/v1/projects/smgcares-a8f14/databases/(default)/documents/checkReservations?key=${API_KEY}`)
.then(res => res.json()).then(console.log).catch(console.error);
