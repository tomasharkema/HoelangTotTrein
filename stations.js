//http://webservices.ns.nl/ns-api-stations-v2
//http://webservices.ns.nl/ns-api-avt?station=KBW

if (Meteor.isServer) {
    var parser = Meteor.npmRequire('libxml-to-js');
    Meteor.startup(function () {
        Meteor.http.get("http://webservices.ns.nl/ns-api-stations-v2", {
            auth: "tomas@harkema.in:kh8ZilSuswjYn4euawWLtWlgSEPj0-fVbnW0nOlxrHKmp05gSDh-Sw"
        }, function (err, res) {

            parser(res.content, function (err, res) {
                res.Station.forEach(function(station){
                    //console.log(station);

                    if (Stations.findOne(station) === undefined) {
                        Stations.insert(station);
                    }
                });
            });
        });
    });
}