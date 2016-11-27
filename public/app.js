function makeid(len){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


var socket = io('http://localhost:3000');
var atoken = null;


var $container = $('.container');

function notify(text) {
	var notif = $('<span class="notification">' + text + '</span>');

	notif.fadeOut(2000, function(){
  		$(this).remove();
	});

	$('body').append(notif);
}

function removeUser(token, id) {
	return new Promise(function(res, rej) {
		socket.emit('removeuser', { token: token, id: id }, function(result) {
			if (result.success) res();
			else rej(result.reason);
		});
	});
}

function editUser(token, id, name, surname, address, username, email) {
	return new Promise(function(res, rej) {
		var upd = {
			name: name,
			surname: surname,
			address: address,
			username: username,
			email: email
		};

		socket.emit('updateuser', { token: token, id: id, update: upd }, function(result) {
			if (result.success) res();
			else rej(result.reason);
		});
	});
}

function addUser(token, name, surname, address, username, email, password) {
	return new Promise(function(res, rej) {
		var data = {
			name: name,
			surname: surname,
			address: address,
			username: username,
			email: email,
			password: sha1(password)
		};


		socket.emit('adduser', { token: token, data: data }, function(result) {
			if (result.success) res();
			else rej(result.reason);
		});
	});
}

function refreshView(users) {
	if (atoken == null) {
		$container.html('Musisz się zalogować, aby uzyskać dostęp. <button id="modal-send">Zaloguj</button>');
	} else {
		if (users !== null && users !== undefined) {
			var $table = $('<table></table>');

			$table.append('<thead><tr><th></th><th>Imię</th><th>Nazwisko</th><th>Adres</th><th>Login</th><th>Email</th><th>Zarządzanie</th></tr></thead>');

			users.forEach(function(user, i) {
				var $row = $('<tr></tr>');
				var $editbutton = $('<button>Zapisz</button>');
				var $deletebutton = $('<button>Usuń</button>');

				$row.append('<td>' + i + '</td>');
				var $td_name = $('<td contenteditable>' + user.name + '</td>');
				var $td_surname = $('<td contenteditable>' + user.surname + '</td>');
				var $td_address = $('<td contenteditable>' + user.address + '</td>');
				var $td_username = $('<td contenteditable>' + user.username + '</td>');
				var $td_email = $('<td contenteditable>' + user.email + '</td>');

				var $td_man = $('<td></td>');

				$td_man.append($editbutton);
				$td_man.append($deletebutton)

				$row.append($td_name, $td_surname, $td_address, $td_username, $td_email, $td_man);

				$deletebutton.on('click', function() {
					removeUser(atoken, user._id).then(function(result) {
						notify('Użytkownik został usunięty.')
						refreshView();
					}).catch(function(err) {
						notify('Nie udało się usunąć użytkownika. (Powód: ' + err);
					});
				});

				$editbutton.on('click', function() {
					editUser(atoken, user._id, $td_name.html(), $td_surname.html(), $td_address.html(), $td_username.html(), $td_email.html()).then(function(result) {
						notify('Zapisano!');
						refreshView();
					}).catch(function(err) {
						notify('Nie udało się edytować użytkownika. (Powód: ' + err);
					});
				});

				$table.append($row);
			});

			var $n_row = $('<tr></tr>');
			var $n_savebutton = $('<button>Dodaj</button>');

			$n_row.append('<td></td>');
			var $new_name = $('<td contenteditable></td>');
			var $new_surname = $('<td contenteditable></td>');
			var $new_address = $('<td contenteditable></td>');
			var $new_username = $('<td contenteditable></td>');
			var $new_email = $('<td contenteditable></td>');
			var $new_password = $('<td contenteditable></td>');

			var $new_man = $('<td></td>');

			$new_man.append($n_savebutton);

			$n_row.append($new_name, $new_surname, $new_address, $new_username, $new_email, $new_password, $new_man);

			$n_savebutton.on('click', function() {
				addUser(atoken, $new_name.html(), $new_surname.html(), $new_address.html(), $new_username.html(), $new_email.html(), $new_password.html()).then(function(result) {
					notify('Dodano!');
					refreshView();
				}).catch(function(err) {
					notify('Nie udało się dodać nowego użytkownika. (Powód: ' + err);
				});
			});


			$table.append('<thead><tr><th></th><th>Imię</th><th>Nazwisko</th><th>Adres</th><th>Login</th><th>Email</th><th>Hasło</th><th>Zarządzanie</th></tr></thead>');
			$table.append($n_row);


			$container.html('Kliknij na pole, aby je edytować. Po zakończeniu edycji naciśnij "Zapisz".<br><br>');
			$container.append($table);
		} else {
			getAllUsers(atoken).then(function(nusers) {
				refreshView(nusers);
			}).catch(function(err) {
				console.log(err);
			});
		}
	}
}

refreshView();

function getAllUsers(token) {
	return new Promise(function(res, rej) {
		socket.emit('getAllUsers', { token: token }, function(result) {
			if (result.success) {
				res(result.users);
			} else {
				rej(result.reason);
			}
		});
	});
}










var $modal = $('#login-modal');
var $modal_button = $('#modal-send');
var $modal_close = $('#modal-close');

$modal_button.on('click', function() {
	$modal.fadeIn();
});

$modal_close.on('click', function() {
	$modal.fadeOut();
});

var $l_username = $('#login-username');
var $l_password = $('#login-password');
var $l_button   = $('#login-send');
var $l_info = $('#login-info');

$l_button.on('click', function() {
	var username = $l_username.val();	
	var password = $l_password.val();
	var ctok = makeid(12);

	socket.emit('init_login', { username: username, ctok: ctok }, function(data) {
		$l_info.html('');
		if (data.success) {
			var stok = data.stok;

			socket.emit('finish_login', { token: data.token, password: sha1(sha1(password) + stok + ctok) }, function(rdata) {
				if (rdata.success) {
					atoken = rdata.token;
					$l_info.html('Zalogowano!');
					refreshView();
					$modal.fadeOut();
				} else {
					$l_info.html(rdata.reason);
				}
			});
		} else {
			$l_info.html(data.reason);
		}
	});
});

var $r_name = $('#register-name');
var $r_surname = $('#register-surname');
var $r_address = $('#register-address');
var $r_email = $('#register-email');
var $r_username = $('#register-username');
var $r_password = $('#register-password');
var $r_send = $('#register-send');
var $r_info = $('#register-info');

$r_send.on('click', function(){
	socket.emit('register', {
		name: $r_name.val(),
		surname: $r_surname.val(),
		address: $r_address.val(),
		email: $r_email.val(),
		username: $r_username.val(),
		password: sha1($r_password.val())
	}, function(data) {
		if (data.success) {
			$r_info.html('Rejestracja się powiodła!');
			$('input[id^=register]').val('');
			$('#register-address').val('');
		}
	});
});