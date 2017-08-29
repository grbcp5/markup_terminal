var admin = require( "firebase-admin" );
var stdin = process.openStdin();


var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://betasig-d4b96.firebaseio.com"
        });

var db = admin.database();
var ref = db.ref();


var alert = function( str ) {
  console.log( str );
}

var getUserRefForID = function( student_id, callback, failureCallback ) {

  var idPath = "/members/usernames/" + student_id;
  var idRef = ref.child( idPath );
  idRef.once( "value", function( snap ) {

    var username = snap.val();
    if( username ) {

      var usernamePath = "/members/" + username;
      var usernameRef = ref.child( usernamePath );
      usernameRef.once( "value", callback );

    } else {
      failureCallback();
    }

  } );

};

var getItemForBarcode = function( input, callback ) {

  var itemPath = "/markup/products/" + input;
  var itemRef = ref.child( itemPath );
  itemRef.once( "value", function( itemSnap ) {

    if( itemSnap.exists() ) {

      var item = {
        "barcodeNumber": itemSnap.key,
        "description": itemSnap.val().description,
        "price": itemSnap.val().price
      }
      callback( item );

    } else {

      alert( "That item does not match any item in the database." );
      return;

    }

  } );

}


















function Cart() {
  var itemsInCart = [];
  var purchasingUser = null;

  this.addItemToCart = function( item ) {

    itemsInCart.push( item );

    alert( purchasingUser.school.username + " purchased " + item.description );
    var currentPurchasingUser = purchasingUser;
    this.completeTransaction();
    this.clearTransaction();
    purchasingUser = currentPurchasingUser;

  }

  this.setPurchasingUser = function( user ) {
    purchasingUser = user;

    alert( "Set purchasing user to " + user.school.username );
  }

  this.completeTransaction = function() {
    
    /* Bail if not enough info to make a transaction */
    if( purchasingUser == null || itemsInCart.length === 0 ) {
      alert( "Cannot complete transaction" );
      return;
    }

    /* DB variables */
    var transactionsPath = "/markup/transactions";
    var transactionsRef = ref.child( transactionsPath );
    var userTransactionsPath = "/members/" + purchasingUser.school.username + "/markup/transactions";
    var changes = {};

    /* Prepare all database changes */
    var descriptionString = "Member:\n   " + purchasingUser.name.first + " " + purchasingUser.name.last + "\nCart:";
    for( var i = 0; i < itemsInCart.length; i++ ) {
      descriptionString += "\n   " + itemsInCart[ i ].description;

      var transactionRecord = {
        "member": purchasingUser.school.username,
        "product": itemsInCart[ i ].barcodeNumber
      }

      var newTransactionKey = transactionsRef.push().key;
      changes[ transactionsPath + "/" + newTransactionKey ] = transactionRecord;
      changes[ userTransactionsPath + "/" + newTransactionKey ] = true;

    }

    /* Give user chance to bail */
    // var shouldComplete = confirm( 
    //   descriptionString + 
    //   "\n\nAre you sure you want to complete this transaction?" 
    // );

    // if( !shouldComplete )
    //   return;

    // TODO: Make less DB calls
    for( var i = 0; i < itemsInCart.length; i++ ) {
      var itemQuantityPath = "/markup/products/" + itemsInCart[ i ].barcodeNumber + "/quantity";
      var itemQuantityRef = ref.child( itemQuantityPath );
      itemQuantityRef.transaction( function ( current_value ) {
        return ( current_value || 0 ) - 1;
      } );
    }

    // Send Updates
    ref.update( changes )

  }

  this.clearTransaction = function() {

    itemsInCart = [];
    purchasingUser = null;

  }

}
var cart = new Cart();







function InputHandler() {

  var currentInput = "";
  var recievedStudentID = false;

  var addItem = function( input ) {

    getItemForBarcode( input, function( item ) {

      cart.addItemToCart( item );

    } );

  }

  var setUser = function( input ) {
    
    getUserRefForID( input, function( userSnap ) {

      var user = {
        "name": userSnap.val().name,
        "school": userSnap.val().school
      }

      // $( "#studentID" ).val( user.name.first + " " + user.name.last );
      // $( "#studentIDTextField" ).addClass( "is-focus" );
      // $( "#studentIDTextField" ).addClass( "is-dirty" );

      cart.setPurchasingUser( user );

    }, function() {

      alert( "That Student ID does not match any member." );
      recievedStudentID = false;

    } );

  }

  this.handleInput = function( input ) {

    if( !recievedStudentID || input.substring( 0, 1 ) == ";" ) {

      if( input == "" )
        return;

      if( input.substring( 0, 1 ) == ";" ) {
        input = input.substring( 2, 10 );
      }

      setUser( input );
      recievedStudentID = true;

    } else if( input == "" ) {
      cart.completeTransaction();
    } else {
      addItem( input );
    }

  }

}
var inputHandler = new InputHandler();


stdin.addListener("data", function(d) {
        // note:  d is an object, and when converted to a string it will
        // end with a linefeed.  so we (rather crudely) account for that  
        // with toString() and then trim() 
        inputHandler.handleInput( d.toString().trim() );
});
    
