var Playlists = new Meteor.Collection('playlists');
var Tokens = new Meteor.Collection('tokens');

if (Meteor.isClient) {
  // init/change view code

  var playlists_loaded = false;
  window.Playlists = Playlists;
  window.Tokens= Tokens;
  Session.setDefault('curr_playlist', null);

  Meteor.subscribe('playlists', function() {
    playlists_loaded = true;
    setPageState();
  });

  window.onpopstate = function(event) {
    setPageState();
  };

  function setPageState() {
    if (!playlists_loaded) return;
    var playlist_name = window.location.pathname.substr(1); 
    var playlist = playlist_name == '' ? null : Playlists.findOne({"name": playlist_name});
    changePlaylist(playlist);
  }

  Template.container.curr_playlist = function() {
    return Session.get('curr_playlist');
  };

  Template.home.playlists = function() {
    return Playlists.find({}).fetch();
  };

  Template.home.tokens = function() {
    return Tokens.find({}).fetch();
  };

  // Homepage view

  Template.home.events({
    'submit #create_playlist_form' : function () {
        var $playlist_name = $('#playlist_name');
        var playlist = createPlaylist($playlist_name.val());
        changePlaylist(playlist);
        $playlist_name.val('');
        return false;
    }
  });

  function createPlaylist(name) {
      var id = Playlists.insert({name: name});
      return Playlists.findOne({"_id": id});
  }

  function changePlaylist(playlist) {
      Session.set('curr_playlist', playlist);
      var playlist_name = window.location.pathname.substr(1); 
      if ((playlist && playlist.name == playlist_name) ||
          (!playlist && playlist_name == '')) {
          return;
      }
      history.pushState(null, null, '/' + (playlist ? playlist.name : ''));
  }

  // Playlist view

}


if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish('playlists', function() {
      return Playlists.find({});
    });
    Meteor.publish('tokens', function() {
      return Tokens.find({});
    });
  });
}
