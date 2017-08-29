var admin = require( "firebase-admin" );
var stdin = process.openStdin();


var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://betasig-d4b96.firebaseio.com"
        });

var db = admin.database();
var ref = db.ref("author");
ref.once("value", function(snapshot) {
  console.log(snapshot.val());
});

stdin.addListener("data", function(d) {
        // note:  d is an object, and when converted to a string it will
        // end with a linefeed.  so we (rather crudely) account for that  
        // with toString() and then trim() 
        console.log("you entered: [" + 
                  d.toString().trim() + "]");
          });
    
