Tijden = new Meteor.Collection("Tijden");
Stations = new Meteor.Collection("Stations");

if (Meteor.isClient) {
  Session.setDefault("van", "");
  Session.setDefault("naar", "");
  Session.setDefault("advice", {});

  function filterAdvice() {
    return _.filter(Session.get("advice").ReisMogelijkheid, function(item){return new Date(item.ActueleVertrekTijd).getTime() > Session.get("currentTime") - 60*60*1000;});
  }

  function advice(){
    Meteor.call("createAdvice", Session.get("van"), Session.get("naar"), function(err, advice){
      if (!err) Session.set("advice", advice);
    });
  }

  function getPlatform(advice){
    var reisdeel = advice.ReisDeel//.ReisStop[0].Spoor["#"];
    if (reisdeel instanceof Array) {
      return reisdeel[0].ReisStop[0].Spoor["#"];
    } else {
      return reisdeel.ReisStop[0].Spoor["#"];
    }
  }

  // HEATBEAT
  Meteor.setInterval(function() {
    Session.set("currentTime", Date.now());
  }, 1000);

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
    var d = new Date(date.getTime() - (now));
    var time = d.getTime();
    if (time < 0) {
      if (time < -60*60*1000) {
        return moment(d).format("HH:mm");
      } else {
        return moment(d).format("mm:ss");
      }
    } else {
      return moment(d).format("HH:mm");
    }
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

  Template.vanForm.helpers({
    stations:function(){
      return Stations.find();
    },
    selected:function(){
      return (this._id === Session.get("van")) ? "selected" : "";
    }
  });

  Template.naarForm.events({
    "change select":function(e){
      Session.set("naar", e.target.value);
      advice();
    }
  });

  Template.naarForm.helpers({
    stations:function(){
      return Stations.find();
    },
    selected:function(){
      return (this._id === Session.get("naar")) ? "selected" : "";
    }
  });

  Template.advice.helpers({
    advice:function(){
      return _.rest(filterAdvice());
    },
    vertraging: function(){
      var advice = this;
      return advice.Status === "VOLGENS-PLAN" ? "" : advice.AankomstVertraging;
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
      return getPlatform(filterAdvice()[0]);
    },
    advice:function(){
      return filterAdvice()[0];
    },
    vertraging: function(){
      var advice = filterAdvice()[0];
      return advice.Status === "VOLGENS-PLAN" ? "" : advice.AankomstVertraging;
    },
    reisDeel:function(){
      var advice = filterAdvice()[0];
      var reisdeel = advice.ReisDeel;
      if (reisdeel instanceof Array) {
        return _.reduce(reisdeel, function(str, deel, i, obj){
          var firstStop = _.first(deel.ReisStop);
          var lastStop = _.last(deel.ReisStop);
          var isLast = i === obj.length-1;
          var string = (i === 0 ? "" : ("> "+firstStop.Spoor["#"]+")" + (isLast ? "" : ", "))) +  (isLast ? "" : (lastStop.Naam + " ("+lastStop.Spoor["#"]));
          return str + string + " ";
        }, "");
      }
      return "";
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
