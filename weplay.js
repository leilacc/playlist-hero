var Playlists = new Meteor.Collection('playlists');

if (Meteor.isClient) {
  // init/change view code

  $(function() {
    SC.initialize({
      client_id: "e9b793758d29d627c75586e91d726191"
    });

    $('body').on('click', 'a', function() {
      history.pushState(null, null, encodeURI($(this).attr('href')));
      setPageState();
      return false;
    });
  });

  var playlists_loaded = false;
  window.Playlists = Playlists;
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
    var playlist_name = decodeURI(window.location.pathname.substr(1));
    var playlist = playlist_name === '' ? null : Playlists.findOne({"name": playlist_name});
    changePlaylist(playlist);
  }

  Template.container.curr_playlist = function() {
    return Session.get('curr_playlist');
  };

  Template.home.playlists = function() {
    return Playlists.find({}).fetch();
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
      var id = Playlists.insert({name: name, tracks: {}});
      return Playlists.findOne({"_id": id});
  }

  function changePlaylist(playlist) {
      Session.set('curr_playlist', playlist);
      var playlist_name = decodeURI(window.location.pathname.substr(1));
      if ((playlist && playlist.name == playlist_name) ||
          (!playlist && playlist_name === '')) {
          return;
      }
      history.pushState(null, null, '/' + (playlist ? encodeURI(playlist.name) : ''));
  }

  // Playlist view
  //
  function allValues(obj) {
    var list = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        list.push(obj[key]);
      }
    }
    return list;
  }

  function compare_votes(a,b) {
    if (a.votes < b.votes)
      return 1;
    if (a.votes > b.votes)
      return -1;
    return 0;
  }

  Template.playlist.tracks = function() {
    tracks = Playlists.findOne({ _id: Session.get('curr_playlist')._id }).tracks;
    return allValues(tracks).sort(compare_votes).map(function(track) {
      track.did_vote = track.voters && track.voters.indexOf(Meteor.userId()) !== -1;
      return track;
    });
  };

  Template.playlist.events({
    'input #query': function() {
      var query = $('#query').val();
      if (query.length < 3) return;
      SC.get('/tracks', { q: query, limit: 20 }, function(tracks) {
          console.log(tracks);
          Session.set('search_results', tracks);
      });
      return false;
    }
  });

  Template.playlist.results = function() {
    return Session.get('search_results');
  };

  function getCurrPlaylist() {
    return Session.get('curr_playlist');
  }

  Template.playlist.playlist = getCurrPlaylist;

  Template.playlist.events({
    // Add track
    'click .add_track': function(event) {
      var track = this;
      track.votes = 0;
      track.voters = [];
      $(event.currentTarget).attr('disabled', true).val('Added');
      var set = {};
      set['tracks.' + track.id] = track;
      Playlists.update({'_id': getCurrPlaylist()._id},
                      {$set: set}, function(err) {
                        console.log(err);
                      });

      return false;
    }
  });

  Template.playlist.events({
    // Vote for a track
    'click .vote': function(event) {
      var track = this;
      var inc = {};
      inc['tracks.' + track.id + '.votes'] = 1;
      var push = {};
      push['tracks.' + track.id + '.voters'] = Meteor.userId();
      $(event.currentTarget).attr('disabled', true).val('Voted');
      Playlists.update({'_id': getCurrPlaylist()._id },
                       {$inc: inc, $push: push}, function(err) {
                         console.log(err);
                       });

      return false;
    }
  });
}


if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish('playlists', function() {
      return Playlists.find({});
    });
  });
}
