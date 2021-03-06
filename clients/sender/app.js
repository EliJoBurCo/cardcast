angular.module('cardcast', [
  'ngRoute',
  'cardcast.main',
  'cardcast.new',
  'cardcast.auth',
  'cardcast.service',
  'cardcast.deck',
  'cardcast-receiver',
  'cardcast.edit'
])

.config(function($routeProvider, $httpProvider) {

  // these functions are used in the resolve property of routes
  // the route will only proceed if all promises in resolve are not rejected

  // authorize checks the server for an active session
  // the promise will resolve with the username
  // if the promise is rejected, isAuth will redirect to login
  var authorize = function(Auth) {
    return Auth.isAuth();
  };

  // get a deck for a specific user
  var getDecks = function(Service) {
    return Service.getDecks();
  };
  var getDeck = function($route, Service) {
    return Service.getDeck($route.current.params.id);
  };

  // get a specific card
  var getCard = function($route, Service) {
    return Service.getCard($route.current.params.id);
  };

  $routeProvider
    .when('/login', {
      templateUrl: '/sender/controllers/auth/login.html',
      controller: 'AuthCtrl'
    })
    .when('/signup', {
      templateUrl: '/sender/controllers/auth/signup.html',
      controller: 'AuthCtrl'
    })
    .when('/decks', {
      templateUrl: '/sender/controllers/main/main.html',
      controller: 'MainCtrl',
      resolve: {
        // if both promises resolve, it will go to the route
        // the values each promise resolved with can be injected into the controller
        // for example, the variable deck will contain an array of cards for the user
        // and the variable user will contain the username as a string.
        // this makes sure all data is loaded from the database before the views load
        // go to the MainCtrl to see where these are used.
        user: authorize,
        deck: getDecks
      }
    })
    .when('/decks/:id/new', {
      templateUrl: '/sender/controllers/newCard/newCard.html',
      controller: 'NewCtrl',
      resolve: {
        user: authorize,
        deck: getDeck

      }
    })
    .when('/decks/card/:id/edit', {
      templateUrl: '/sender/controllers/cardEdit/cardEdit.html',
      controller: 'EditCtrl',
      resolve: {
        user: authorize,
        card: getCard
      }
    })
    .when('/decks/:id', {
      templateUrl: '/sender/controllers/deck/deck.html',
      controller: 'DeckCtrl',
      resolve: {
        user: authorize,
        deck: getDeck
      }
    })
    .when('/receiver/:id', {
      templateUrl: '/sender/controllers/receiver/receiver.html',
      controller: 'ReceiverCtrl'
    })

    .otherwise({
      redirectTo: '/login'
    });
})

.run(function($rootScope, $location, $timeout, Auth) {

  // put things on the $rootScope so that all views have access to it (controller independent)
  $rootScope.logout = Auth.logout;

  $rootScope.goToDeck = function() {
    $timeout(function() {
      $location.path('/decks');
    });
  };

  // set up an even handler for each time a route changes
  $rootScope.$on('$viewContentLoaded', function(event, next) {

    // initialize a session with a chromecast
    var connect = function() {

      // check and see if there is an active session already available
      // do not initialize if session already exists
      if (!window.session) {

        // set up global variables
        window.applicationID = DEV_APP_ID;
        window.namespace = 'urn:x-cast:pegatech.card.cast';
        window.isCasting = false;
        window.who = null;
        window.session = null;

        // make sure cardId is on the $rootScope
        // the views need to dynamically change based on this value
        // whenever the receiverMessage listener changes this value, the views will update automatically
        $rootScope.cardId = null;
        $rootScope.castingOn = false
        var onInitSuccess = function() {
          console.log('Successful initialization');
        };

        var onError = function(message) {
          console.log('onError: ' + JSON.stringify(message));
        };

        var onSuccess = function(message) {
          console.log('onSuccess: ' + message);
        };

        var onEndSession = function() {
          session = null;
          console.log('Successfully ended session');
        };

        // makes sure the session is always up to date with the receiver
        // removes the session if the reciever ends the session
        var sessionUpdateListener = function(isAlive) {
          if(!session) return
          var message = isAlive ? 'Session Updated' : 'Session Removed';
          message += ': ' + session.sessionId;
          console.log(message);
          if (!isAlive) {
            $rootScope.castingOn = false;
            session = null;
          }
        };


        // listen to messages from the reciever
        // the receiver will continually broadcast messages with information
        // about what is being casted, specifically the stop casting button in
        // main.html and the cast overwrite dialogs rely on these messages

        // if the cardId that is casting matches the card view in main.html,
        // a stop casting button will be shown

        // if isCasting is true, the user will be promted if they want to
        // overwrite the cast that is already on the screen

        var receiverMessage = function(namespace, message) {
          var message = JSON.parse(message);
          isCasting = message.isCasting;
          who = message.who;
          $rootScope.cardId = message.cardId;
          $rootScope.$apply();
          console.log('function entered');
          console.log('receiverMessage: ' + namespace + ', ' + message.cardId);
        };

        // log events
        var receiverListener = function(event) {
          if (event === 'available') {
            console.log('receiver found');
          } else {
            console.log('receiver list empty');
          }
        };

        // listen for new sessions and update with the proper listeners appropriately
        window.sessionListener = function (currentSession) {

          console.log('New session ID: ' + currentSession.sessionId);
          session = currentSession;
          session.addUpdateListener(sessionUpdateListener);
          session.addMessageListener(namespace, receiverMessage);
        };

        // will end a session
        window.endSession = function() {
          if (session) {
            session.leave(onEndSession, onError);
          }
        };

        // initalize the session with all of the above configurations
        var initialize = function() {

          // make sure the cast library resource is loaded onto the page
          // if it is not, recursively try again in one second
          if (!chrome.cast || !chrome.cast.isAvailable) {
            setTimeout(initialize, 1000);
          } else {

            // initialize the session
            var sessionRequest = new chrome.cast.SessionRequest(applicationID);
            var apiConfig = new chrome.cast.ApiConfig(sessionRequest, sessionListener, receiverListener);

            chrome.cast.initialize(apiConfig, onInitSuccess, onError);

          }
        };

        initialize();
      }
    };

    var path = $location.path();

    // run the connect function only if the user is not on the login or signup page
    if (path !== '/login' || path !== '/signup') {
      connect();
    }

    // method is apart of Material Design Lite
    // The MDL javascript animations are only rendered on the page at load time
    // this will rerender the animations each time the view loads to make sure
    // all componenets have their special effects.
    componentHandler.upgradeAllRegistered();
  });

})
.directive('preview', function() {
  return {
    template:
      '<div class="card-preview col-md-6">' +
        '<div class="mdl-card mdl-shadow--4dp">' +
          '<div class="mdl-card__supporting-text">' +
            '<div ng-bind-html="preview"></div>' +
          '</div>' +
        '</div>' +
      '</div>'
  };
})
.directive('btn', function() {
  return {
    restrict: 'E',
    transclude: true,
    scope: { action: '&', flat: '@', accent: '@' },
    template: `<button ng-click="action()" ng-class="{'mdl-button': true, 'mdl-js-button': true, 'mdl-js-ripple-effect': true, 'mdl-button--accent': accent!==undefined, 'mdl-button--raised': flat===undefined }"><ng-transclude></ng-transclude></button>`
  };
})
.directive('add', function() {
  return {
    restrict: 'E',
    transclude: true,
    scope: { action: '&' },
    template: `<a ng-click="action()" class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--accent mdl-shadow--4dp"><i class="material-icons">add</i></a>`
  };
})
.directive('projector', ['$window', function($window){
  return {
    restrict: 'E',
    scope: { content: '=' },
    templateUrl: '/assets/projector.html',
    link: function($scope, $element){
      const aspectRatio = $window.innerWidth / $window.innerHeight;
      const width = $element.find('div')[0].offsetWidth;
      $scope.height = width / aspectRatio + 'px';
    }
  }
}]);
