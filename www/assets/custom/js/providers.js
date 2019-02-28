document.addEventListener("deviceready", onDeviceReady, false);

//init
var api = null;
var db = null;
var keyS = null;

var host = null;
var base_api_url = null;
var setting_api = null;

// --- User ---
var Customer_Login = false;
var Customer_ID = null;
var Customer_Username = null;
var Customer_Password = null;

var chackLoginFirst = true;

var watchID = navigator.geolocation.watchPosition(onSuccessGeolocation,
    onErrorGeolocation, { timeout: 100000 });

// --- Transaksi Pegi Lagi ---
var tr_customer = [];

document.addEventListener("pause", onPause, false);

function onPause() {
    // Handle the pause event
    var watchID = navigator.geolocation.watchPosition(onSuccessGeolocation,
        onErrorGeolocation, { timeout: 100000 });

}

function onDeviceReady() {
    //init service api
    host = 'http://dev.pegilagi.com/';
    base_api_url = host+'mobil/web/rest/customer/user/';

    setting_api = {
        async : true,
        crossDomain : true
    };

    //init service sql
    db = (window.cordova.platformId === 'browser') ?
        window.openDatabase('_tb01', '1.0', 'Data', 2*1024*1024) :
        window.sqlitePlugin.openDatabase({name: '_tb01.db', location: 'default'});

    //keys encrypt/decrypt
    keyS = "pegiL4g1TCustomerKeys";

    checkLogin();

}

function checkLogin() {
    var fascy = localStorage.getItem('fascy');
    var hascy = localStorage.getItem('hascy');
    var token = localStorage.getItem('token');

    if(fascy!='' && fascy!=null && typeof fascy !== 'undefined' &&
        hascy!='' && hascy!=null && typeof hascy !== 'undefined' &&
        token!='' && token!=null && typeof token !== 'undefined'){

        // Load token
        var data_token1 = jwt_decode(hascy+'.'+token+'.'+fascy,keyS);

        if(data_token1.login==true){
            var dataLogin = getDB_Log();

            dataLogin.then(function(result) {
                // here you can use the result of promiseB
                var data_token2 = jwt_decode(result.token,keyS+''+keyS);

                var Encrypt1 = dencryption(data_token2.Encrypt1).toString();
                var Encrypt2 = dencryption(data_token2.Encrypt2).toString();
                var Encrypt3 = dencryption(data_token2.Encrypt3).toString();

                if(Encrypt1!='' && Encrypt1!=null &&
                    Encrypt2!='' && Encrypt2!=null &&
                    Encrypt3!='' && Encrypt3!=null){

                    var ResultLogin = JSON.parse(Encrypt1);


                    var IDUser = '';
                    if(typeof ResultLogin.id !== "undefined"){
                        var expID = ResultLogin.id.split('-');
                        IDUser = (expID.length>1) ? parseInt(ResultLogin.id.split('-')[1]) : ResultLogin.id;
                    }


                    // Customer_ID = IDUser;
                    Customer_ID = ResultLogin.id;
                    Customer_Username = Encrypt2;
                    Customer_Password = Encrypt3;
                    setting_api.beforeSend = function( xhr ) {
                        xhr.setRequestHeader ("Authorization", "Basic " + btoa(Customer_Username+":"+Customer_Password));
                    };
                    Customer_Login = true;

                    // if(chackLoginFirst==true){

                        // console.log('cek pertama login');

                        setting_api.error = function () {

                            // window.location.replace('template_customer.html?page=login&subpage=passwordchanged');

                        };

                        // $.ajax(setting_api).done(function (response) {
                        //
                        // });

                        // chackLoginFirst = false;
                    // }

                    loadCountInbox();

                }
            });

        }

    } else {

        db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS db_log');
            tx.executeSql('DROP TABLE IF EXISTS db_user');
            // tx.executeSql('DROP TABLE IF EXISTS encrypt');
            // E1 = ID, E2 = Username, E3 = Password
            tx.executeSql('CREATE TABLE IF NOT EXISTS db_log (token, LoginAt, status)');
            tx.executeSql('CREATE TABLE IF NOT EXISTS db_user (token, description)');
        }, function(e) {
            // console.log('Transaction Create Table ERROR: ' + e.message);
        }, function() {
            // console.log('Populated database OK');
        });
    }

}

function provid_logOut() {
    db.transaction(function(tx) {
        tx.executeSql('DROP TABLE IF EXISTS db_log');
        tx.executeSql('DROP TABLE IF EXISTS login');
        tx.executeSql('DROP TABLE IF EXISTS encrypt');
    }, function(e) {
        // console.log('Transaction Create Table ERROR: ' + e.message);
    }, function() {
        // console.log('Populated database OK');
    });
}

//encyrption password to store sqlite
function encryption(plan){
    return CryptoJS.AES.encrypt(plan, keyS);
}

//dencyrption password to store sqlite
function dencryption(enc){
    return CryptoJS.AES.decrypt(enc, keyS).toString(CryptoJS.enc.Utf8);
}


function getDB_Log(){

    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM db_log', [], function(tx, rs) {
                if(rs.rows.length>0){
                    // console.log('Select login state : ' + JSON.stringify(rs.rows.item(0)));
                    resolve(rs.rows.item(0));
                }
            }, function(tx, e) {
                // console.log('SELECT error: ' + e.message);
                reject(e.message);
            });
        });
    });
}

//sql login
function setLog(dataLog) {
    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql('INSERT INTO db_log VALUES (?,?,?)', [dataLog,getDateTimeNow(), 1]);
        }, function(e) {
            // console.log('Transaction Insert login state ERROR: ' + e.message);
            reject(e.message);
        }, function(s) {
            // console.log('Insert login state OK');
            resolve(s);
        });
    });
}

function sILoginState(u){
    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql('INSERT INTO login VALUES (?,?)', [u, 1]);
        }, function(e) {
            // console.log('Transaction Insert login state ERROR: ' + e.message);
            reject(e.message);
        }, function(s) {
            // console.log('Insert login state OK');
            resolve(s);
        });
    });
}
function sSLoginState(){
    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM login', [], function(tx, rs) {
                if(rs.rows.length>0){
                    // console.log('Select login state : ' + JSON.stringify(rs.rows.item(0)));
                    resolve(rs.rows.item(0));
                }
            }, function(tx, e) {
                // console.log('SELECT error: ' + e.message);
                reject(e.message);
            });
        });
    });
}

//sql encrypt
function sIPasswordEncrypt(p){
    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql('INSERT INTO encrypt VALUES (?,?)', [p, 1]);
        }, function(e) {
            // console.log('Transaction Insert password encrypt ERROR: ' + e.message);
            reject(e.message);
        }, function(s) {
            // console.log('Insert password encrypt OK');
            resolve(s);
        });
    });
}
function sSPasswordEncrypt(){
    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM encrypt', [], function(tx, rs) {
                if(rs.rows.length>0){
                    // console.log('Select password encrypt : ' + JSON.stringify(rs.rows.item(0)));
                    resolve(rs.rows.item(0));
                }
            }, function(tx, e) {
                // console.log('SELECT error: ' + e.message);
                reject(e.message);
            });
        });
    });
}

function onSuccessGeolocation(position) {

    // Sending location per 5 menit
    if(Customer_Login==true){


        setting_api.method = 'POST';
        setting_api.contentType = 'application/json';
        setting_api.url = base_api_url+'savelonglat';
        setting_api.data = JSON.stringify([{
            latitude :  position.coords.latitude,
            longitude : position.coords.longitude,
            created_date_time : moment().format('YYYY-MM-DD HH:mm:ss'),
            user_teman_pegi_customer_id : Customer_ID
        }]);

        $.ajax(setting_api).done(function (jsonResult) {
            // console.log(jsonResult);

        });

    }

}

// onError Callback receives a PositionError object
//
function onErrorGeolocation(error) {
    console.log('code: '    + error.code    + '\n' +
        'message: ' + error.message + '\n');
}



