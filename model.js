const nedb    = require('nedb');
const crypto  = require('crypto');
const db	  = new nedb({ filename: 'database', autoload: true });

function makeid(len){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function createToken() {
	return new Promise(function(resolve, reject) {
		crypto.randomBytes(48, function(err, buffer) {
  			if (err) reject(err);
  			else resolve(buffer.toString('hex'));
		});
	});
}

function getToken(username, ctok) {
	return createToken(ctok).then(function(token) {
		return insertData({ type: 'token', token: token, date: new Date, ctok: ctok, stok: makeid(12), uname: username, finished: false }).then(function(doc) {
			return doc;
		});
	});
}

function verifyToken(token) {
	return new Promise(function(resolve, reject) {
		db.update({ token: token }, { $set: { finished: true }}, {}, function(err) {
			if (err) reject(err);
			else resolve();
		});
	});
}

function isValidToken(token) {
	return new Promise(function(resolve, reject) {
		db.findOne({ token: token }, function(err, token) {
			if (err) reject(err);
			if (token) {
				if (token.finished === true) {
					resolve();
				} else {
					reject('token invalid');
				}
			}
			else reject('token not found');
		});
	});
}

function getAllUsers() {
	return new Promise(function(resolve, reject) {
		db.find({ type: 'user' }, { password: 0 }).sort({ created: 1 }).exec(function(err, users) {
			if (err) reject(err);
			else resolve(users);
		});
	});
}

function sha1(text) {
	return crypto.createHash("sha1").update(text,"utf8").digest("hex");
}

function findToken(token) {
	return new Promise(function(resolve, reject) {
		db.findOne({ token: token }, function(err, doc) {
			if (err) reject(err);
			else {
				if (doc) resolve(doc);
				else reject('token not found');
			}
		});
	});
}

function insertData(data) { 
	return new Promise(function(resolve, reject) {
		db.insert(data, function(err, doc) {
			if (err) reject(err);
			else resolve(doc);
		});
	});	
}

function createNewUser(data) {
	return new Promise(function(resolve, reject) {
		db.insert({
			type: 'user',
			name: data.name,
			surname: data.surname,
			address: data.address,
			username: data.username,
			password: data.password,
			email: data.email,
			created: new Date
		}, function(err, doc) {
			if (err) reject(err);
			else resolve(doc);
		});
	});
}

function checkIfFieldIsTaken(field, value) {
	return new Promise(function(resolve, reject) {
		db.count({ [field]: value }, function(err, count) {
			if (err) reject(err);
			else {
				if (count > 0) {
					reject(field + ' is already taken');
				} else {
					resolve();
				}
			}
		});
	});
}

function getUser(username) {
	return new Promise(function(resolve, reject) {
		db.findOne({ username: username }, function(err, doc) {
			if (err) reject(err);
			else {
				if (doc) resolve(doc);
				else reject('user not found');
			}
		});
	});
}

function updateUser(id, data) {
	return new Promise(function(resolve, reject) {
		db.update({ _id: id }, { $set: data }, {}, function(err, res) {
			if (err) reject(err);
			else {
				resolve();
			}
		});
	});
}

function removeUser(id) {
	return new Promise(function(resolve, reject) {
		db.remove({ _id: id }, {}, function(err, res) {
			if (err) reject(err);
			else {
				resolve();
			}
		});
	});
}


module.exports = {
	create: createNewUser,
	check: checkIfFieldIsTaken,
	getToken: getToken,
	get: getUser,
	sha1: sha1,
	findToken: findToken,
	verifyToken: verifyToken,
	getAllUsers: getAllUsers,
	isValidToken: isValidToken,
	updateUser: updateUser,
	removeUser: removeUser
}