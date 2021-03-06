fs = Npm.require("fs")
base = process.env.PWD
Future = Npm.require('fibers/future')

PluginsServer.parsePackages = function(keys) {
  var myFuture = new Future()

  fs.readFile(base+'/.meteor/packages', 'utf8', function (err, data) {
    if (err)
        myFuture.throw(error)

    var dat = parseplugins(data, keys)
     myFuture.return(dat)
  });

  return myFuture.wait()
}

PluginsServer.setPackages = function() {
  var dat = PluginsServer.parsePackages()

  PluginsServer.persist.Plugins.update(
    {key: {$in: dat}},
    {$set: {isActive: true}},
    {multi: true}
  )

  PluginsServer.persist.Plugins.update(
    {key: {$nin: dat}},
    {$set: {isActive: false}},
    {multi: true}
  )
}

PluginsServer.updatePackages = function(keys) {
  var dat = PluginsServer.parsePackages(keys)
  var plugins = PluginsServer.persist.Plugins.find({key: {$in: keys}}).map(function(p) {
    if(!p.isRemovable && dat.indexOf(p.key) === -1)
      dat.push(p.key)
  })

  dat = dat.join("\n")
  
  fs.writeFile(base+'/.meteor/packages', dat, function (err) {
    if (err) throw err;
  })
}

parseplugins = function(data, keys){
	var datap = data.split("\n")
	var lines=[]
	var temp, add = []
  if(keys)
    add = JSON.parse(JSON.stringify(keys))

	for(line in datap){
		if (datap[line].indexOf('#') > 0) {
			temp = datap[line].substring(0, datap[line].indexOf('#'));
		} else {
      if(keys && keys.length > 0 && keys.indexOf(datap[line]) !== -1)
        add.splice(add.indexOf(datap[line]), 1)
			else
        temp = datap[line]
		}
		temp = temp.trim()
		if (temp != "" && temp !== lines[lines.length-1])
      lines.push(temp)
	}

  for(i in add)
    lines.push(add[i])

  return lines
}

Meteor.methods({
  updatePackage: function(keys) {
      PluginsServer.updatePackages(keys)
  }
})

Meteor.startup(function() {
  if(!PluginsServer.persist.Plugins.findOne()) {
    var choices = PluginsServer.choices
    for(k in choices) {
      PluginsServer.persist.Plugins.insert(choices[k])
    }
  }

  PluginsServer.setPackages()
})