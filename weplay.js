var Playlists = new Meteor.Collection('playlists');

if (Meteor.isClient) {
  var playlists_loaded = false;
  window.Playlists = Playlists;
  Session.setDefault('curr_playlist', null);

  Meteor.subscribe('playlists', function() {
    playlists_loaded = true;
    setPageState();
  });

  function setPageState() {
    if (!playlists_loaded) return;
    var playlist_name = window.location.pathname.substr(1); 
    var playlist = playlist_name == '' ? null : Playlists.findOne({"name": playlist_name});
    changePlaylist(playlist);
  }

  Template.container.curr_playlist = function() {
    return Session.get('curr_playlist');
  };

  Template.home.create = function () {
    return "Create a new playlist";
  };

  Template.home.search = function () {
    return "Search existing playlists";
  };

  Template.home.playlists = function() {
    return Playlists.find({}).fetch();
  };

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

  window.onpopstate = function(event) {
    setPageState();
  };
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish('playlists', function() {
      return Playlists.find({});
    });
  });
}


