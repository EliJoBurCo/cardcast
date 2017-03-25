angular.module('cardcast.deck', [
  'ngSanitize'
])
.controller('DeckCtrl', function($scope, $location, $routeParams, $sanitize,$timeout, $sce, Service, deck, $rootScope) {
  $scope.deck = deck;
  $scope.currentCard = {};
    $scope.editing = false

  $scope.handleSubmit = (deck) => Service.updateDeck(deck).then(() =>$scope.switch())
  $scope.switch = () => $scope.editing = !$scope.editing
  $scope.preview = '';
  $scope.setCurrent = function(card) {
    $scope.deck.current = card._id;
    Service.setCurrent(card)
      .then(res=> {
        if(session) {
          $scope.castCard(card)
        }
      })
  }

  // Deletes selected card from the database
  $scope.deleteCard = function(card) {
    Service.setCurrent({deck: card.deck, _id: null})
    Service.deleteCard(card)
      .then(function(resp) {
        var index = $scope.deck.cards.indexOf(card);
        $scope.deck.cards.splice(index, 1);
      });
  };

  $scope.$watch('deck.current', function(newValue, oldValue) {
    let content = $scope.deck.cards.filter(card => card._id === newValue)[0].card;
    $scope.preview = $sanitize(Service.markDownCompile(content));
  });
  $scope.showPopup = function(deck) {
      var currentCard
      var found = false;
      deck.cards.forEach((card) => {

        if (card._id === deck.current) {
          found = true;
          currentCard = card
        }
      })



    // if there is an active session and no one is casting, cast the card
    if (session && !isCasting) {
      console.log(session.status);
      $scope.castCard(currentCard);

    // if there is an active session and someone else is casting show popup
    } else if (session && isCasting) {
      $scope.showWarning = true;
      $scope.currentCard = card;
    } else if (chrome.cast) {

    // if there is no active session request one
      chrome.cast.requestSession(function(currentSession) {
        sessionListener.call(null, currentSession);

        // Provides extra time for the reciever to respond
        $timeout(function() {
          if (!isCasting) {
            $scope.castCard(currentCard);
          } else {
            $scope.showWarning = true;
            $scope.currentCard = card;
          }
        }, 100);
        $rootScope.castingOn = !$rootScope.castingOn
        console.log(castingOn)
      }, console.log.bind(null, 'XXXonError: '));
    }
  };

  // clears popup warning if user cancels the cast
  $scope.cancelCast = function() {
    $scope.showWarning = false;
  };
  $scope.stopCast = function () {
    $rootScope.castingOn = !$rootScope.castingOn
    endSession()
  }



  // Sends cast using the card that invoked showPopup. The username tracks who is currently casting
  // Passing the 'clear' parameter stops the current cast and reverts everything to default state.
  $scope.castCard = function(card, clear = false) {
    var message = {
      deck: clear ? null : card.deck,
      card: clear ? '<h2>Welcome to CardCast!</h2><br/>Nothing has been casted yet...' : card.card,
      cardId: clear ? null : card._id
    };
    $scope.showWarning = false;
    session.sendMessage(namespace, JSON.stringify(message), console.log.bind(null, 'onSuccess: ', 'Message was sent: ' + message), console.log.bind(null, 'XonError: '));
  };

});
