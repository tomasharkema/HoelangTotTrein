Tijden = new Meteor.Collection("Tijden");
Stations = new Meteor.Collection("Stations");

if (Meteor.isClient) {
  Session.setDefault("van", "");
  Session.setDefault("naar", "");
  Session.setDefault("advice", {});

  function filterAdvice() {
    return _.filter(Session.get("advice").ReisMogelijkheid, function(item){return new Date(item.ActueleVertrekTijd).getTime() > Session.get("currentTime") - 60*60*1000;});
  };

  Meteor.setInterval(function() {
    Session.set("currentTime", Date.now());
  }, 1000);

  function advice(){
    Meteor.call("createAdvice", Session.get("van"), Session.get("naar"), function(err, advice){
      if (!err) Session.set("advice", advice);
    });
  }

  advice();

  Meteor.setInterval(function() {
    advice();
  }, 30000);

  Template.registerHelper('formatDate', function(date) {
    return moment(date).zone(-2).format('HH:mm');
  });

  Template.registerHelper('timeLeft', function(date) {
    var date = new Date(date);
    var now = Date.now();
    var d = new Date(date.getTime() - (now - 60*60*1000));
    return moment(d).format("mm:ss");
  });

  Template.form.events({
    "click .switch":function(){
      var van = Session.get("van");
      var naar = Session.get("naar");
      Session.set("van", naar);
      Session.set("naar", van);
      advice();
    }
  });

  Template.vanForm.events({
    "change select":function(e){
      Session.set("van", e.target.value);
      advice();
    }
  });

  Template.naarForm.events({
    "change select":function(e){
      Session.set("naar", e.target.value);
      advice();
    }
  });

  Template.stationSelect.helpers({
    stations:function(outer){
      console.log(this, outer);
      return Stations.find();
    },
    active:function(){
      return (this._id === Session.get("")) ? "active" : "";
    }
  });

  Template.advice.helpers({
    advice:function(){
      return filterAdvice();
    }
  });

  Template.adviceFirst.helpers({
    van: function () {
      return Stations.findOne({_id:Session.get("van")}).Namen.Lang;
    },
    naar:function(){
      return Stations.findOne({_id:Session.get("naar")}).Namen.Lang;
    },
    vertrekSpoor:function(){
      return filterAdvice()[0].ReisDeel.ReisStop[0].Spoor["#"];
    },
    advice:function(){
      return filterAdvice()[0];
    }
  });
}

if (Meteor.isServer) {
  var parser = Meteor.npmRequire('libxml-to-js');
  Meteor.methods({
    createAdvice:function(van, naar){
      van = Stations.findOne({_id:van});
      naar = Stations.findOne({_id:naar});

      return Meteor.sync(function(done) {
        if (van === undefined || naar === undefined) {
          return done(new Error("geen van of naar"), null);
        }

        Meteor.http.get("http://webservices.ns.nl/ns-api-treinplanner?fromStation="+van.Code+"&toStation="+naar.Code, {
          auth: "tomas@harkema.in:kh8ZilSuswjYn4euawWLtWlgSEPj0-fVbnW0nOlxrHKmp05gSDh-Sw"
        }, function(err, res){
          parser(res.content, function (err, res) {
            console.log("nieuw reisadvies!");
            done(null, res);
          });
        });
      }).result;
    }
  });

}
