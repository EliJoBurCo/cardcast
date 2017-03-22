angular.module('cardcast.main', [])

// Set up main controller for Sender.
.controller('MainCtrl', function($scope, $timeout, $location, Service, user, deck) {

  // Set $scope.deck with info received from deck resolve
  $scope.deck = deck;
  $scope.currentDeck = {};

  //toggles popup warning using 'ng-show' in main.html
  $scope.showWarning = false;
  $scope.showDelete = false;
  $scope.username = user;

  // First checks for a session and sees if anyone else is currently casting.
  // Casts the card that invoked it as long as no one else is casting,
  // otherwise triggers the popup warning.
  $scope.showPopup = function(card) {

    // if there is an active session and no one is casting, cast the card
    if (session && !isCasting) {
      console.log(session.status);
      $scope.castCard(card);

    // if there is an active session and someone else is casting show popup
    } else if (session && isCasting) {
      $scope.showWarning = true;
      $scope.currentDeck = deck;
    } else if (chrome.cast) {

    // if there is no active session request one
      chrome.cast.requestSession(function(currentSession) {
        sessionListener.call(null, currentSession);

        // Provides extra time for the reciever to respond
        $timeout(function() {
          if (!isCasting) {
            $scope.castCard(deck);
          } else {
            $scope.showWarning = true;
            $scope.currentDeck = deck;
          }
        }, 100);

      }, console.log.bind(null, 'onError: '));
    }
  };

  // clears popup warning if user cancels the cast
  $scope.cancelCast = function() {
    $scope.showWarning = false;
  };


  // Deletes selected card from the database
  $scope.deleteDeck = function(deck) {
    Service.deleteDeck(deck)
      .then(function(resp) {
        var index = $scope.deck.indexOf(deck);
        $scope.deck.splice(index, 1);
        $scope.showDelete = false;
      });
  };

  $scope.warnDelete = function(deck) {
    console.log(deck)
    $scope.showDelete = true;
    $scope.currentDeck = deck;
  };

  $scope.cancelDelete = function() {
    $scope.showDelete = false;
  };

});
