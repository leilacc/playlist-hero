var Playlists = new Meteor.Collection('playlists');

if (Meteor.isClient) {
  // init/change view code

  function play(track_url) {
    console.log(track_url);
    Session.set('playing', true);
    SC.oEmbed(track_url, { auto_play: true }, function(oEmbed) {
        console.log('oEmbed response: ', oEmbed);
        $('#nowPlaying').html(oEmbed.html);

        SC.Widget($('#nowPlaying iframe')[0]).bind(SC.Widget.Events.FINISH, function() {
          Session.set('playing', false);
          playNext();
        });
    });
  }

  function playNext() {
    var next_track = getNextTrack();
    if (next_track) {
      moveTrackToRecent(next_track);
      play(getTrackUrl(next_track));
    } else {
      Session.set('playing', false);
    }
  }

  $(function() {
    // Page is finished loading...

    SC.initialize({
      client_id: "e9b793758d29d627c75586e91d726191"
    });

    $('body').on('click', 'a', function() {
      history.pushState(null, null, encodeURI($(this).attr('href')));
      setPageState();
      return false;
    });

    if (Session.get('curr_playlist')) {
      playNext();
    }
  });

  function moveTrackToRecent(track) {
    // Move a track that is about to be played from the tracks list to the
    // recent list.

    // Remove from tracks
    var unset = {};
    unset['tracks.' + track.id] = '';
    Playlists.update({ _id: getCurrPlaylist()._id },
                     { $unset: unset }, function(err) {
                       console.log(err);
                     });

    // Append to recent
    var set = {};
    set['recent.' + track.id] = track;
    Playlists.update({'_id': getCurrPlaylist()._id},
                    {$set: set}, function(err) {
                      console.log(err);
                    });

    return false;
  }

  function getNextTrack() {
    // Returns the top-voted track and removes it from queued track list
    var tracks = Playlists.findOne({ _id: Session.get('curr_playlist')._id }).tracks;
    return allValues(tracks).sort(compare_votes)[0];
  }

  function getTrackUrl(track) {
    var track_url = track.stream_url;
    return track_url.substring(0, track_url.length - 7);
  }

  var playlists_loaded = false;
  window.Playlists = Playlists;

  Meteor.subscribe('playlists', function() {
    playlists_loaded = true;
    setPageState();
  });

  window.onpopstate = function(event) {
    setPageState();
  };

  function setPageState() {
    if (!playlists_loaded) return;
    changePlaylist(getPlaylistFromURI());

  }

  function getPlaylistFromURI() {
    // Returns the playlist specified in the URI
    return getPlaylistFromName(decodeURI(window.location.pathname.substr(1)));
  }

  function getPlaylistFromName(playlist_name) {
    return playlist_name === '' ? null : Playlists.findOne({"name": playlist_name});
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
      var id = Playlists.insert({name: name, tracks: {}, recent: {}});
      return Playlists.findOne({"_id": id});
  }

  function changePlaylist(playlist) {
      Session.set('curr_playlist', playlist);
      playNext();
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
      SC.get('/tracks', { q: query, limit: 10, streamable: true }, function(tracks) {
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

      Session.set('search_results', null);
      if (!Session.get('playing')) {
        playNext();
      }
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
