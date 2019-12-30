const Express = require('express');
const BodyParser = require("body-parser");
const NasgoJS = require('nasgo-js'); 
const http = require('http');
const Mnemonic = require("bitcore-mnemonic");

const log4js = require('log4js');
log4js.configure({
  appenders: { cheese: { type: 'file', filename: 'debug.log' } },
  categories: { default: { appenders: ['cheese'], level: 'all' } }
});

const logger = log4js.getLogger('cheese');

logger.debug('Got start.');

let server = Express();
server.listen(8011,function () {
    console.log('server start');
})

server.use(BodyParser.urlencoded({extended:true}));
server.use(BodyParser.json({limit: '1mb'}));

server.get('/api/uia/transactions/:currency', async (req,res)=>{
    let currency = req.params.currency;
    let offset = req.query.offset?req.query.offset:0;
    let limit = req.query.limit?req.query.limit:100;

    requestNode(`/api/uia/transactions/${currency}?offset=${offset}&limit=${limit}`, null, function (result){
        res.send(result);
    });
});

server.get('/api/transactions/get', async (req,res)=>{
    let id = req.query.id;
                                                                                          
    requestNode(`/api/transactions/get?id=${id}`, null, function (result){
        res.send(result);
    });
});

server.get('/address/:secret', (req,res)=>{

    var code = new Mnemonic(Mnemonic.Words.ENGLISH);
    var secret = code.toString();
    var publicKey = NasgoJS.crypto.getKeys(secret).publicKey;  //Generate public key according to master secret
    var address = NasgoJS.crypto.getAddress(publicKey);                                                        

    res.send({"secret":secret ,"publicKey":publicKey,"address":address});
});

server.post('/setSecureCode/', async (req,res)=>{   
    let password = req.body.mainPassword;
    let secureCode = req.body.secureCode;
    var transaction = NasgoJS.signature.createSignature(password.toString(), secureCode);

    requestNode('/peer/transactions', transaction, function (result){
        res.send(result);
    });
});

server.post('/peer/transactions', async (req,res)=>{

	let precision=8;
	let symbol = req.body.symbol;
	var targetAddress = req.body.to;  
	var amount = req.body.amount * 100000;  //req.body.amount*Math.pow(10,precision);
	var password = req.body.password;
	var secondPassword  = '';
	let message = "";
	var transaction = [];
logger.debug('========================================');
logger.debug(symbol);
logger.debug(targetAddress); 
logger.debug(amount);
logger.debug(req.body.amount);
logger.debug(req.body.amount*Math.pow(10,precision));  
logger.debug('========================================');    
	if('NSG'==symbol.toUpperCase()) { // NSG
		transaction = NasgoJS.transaction.createTransaction(targetAddress, amount, message, password, secondPassword || undefined);  
        }
	else {
//	  var fee = 100000;
//		transaction = NasgoJS.uia.createTransfer(symbol, amount,targetAddress,message, password, secondPassword || undefined); 
//		transaction = NasgoJS.uia.createTransaction(asset, fee, 14, targetAddress, message, password, secondPassword)
       		// transaction = NasgoJS.uia.createTransfer(symbol, amount.toString(), targetAddress, message, password, secondPassword || undefined);   
//createTransfer: function (currency, amount, recipientId, message, secret, secondSecret)
		//
		//
		//
		transaction = NasgoJS.uia.createTransfer(symbol, amount.toString(), targetAddress, message, password, secondPassword);

	
	}

    var data = {transaction: transaction};
    logger.info(JSON.stringify(data));
    console.log(JSON.stringify(data));
    try{ 
    requestNode('/peer/transactions', data, function (result){
        logger.debug(JSON.stringify(result));
        if(result["success"])
            result["transaction"]=transaction["id"];   
        res.send(result);
    });
    } catch(e) {
	console.log("出错了...");
    	console.log(e);
    }
});

function requestNode(path, data=null, callback=(result)=>{}) {

    let method = data?"POST":"GET";
    var post_data = data?JSON.stringify(data):"";  
    var post_options = {
        host: '192.168.5.236',
        port: 9040,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'magic':'594fe0f3',
            'version':''
        }
    };
    console.log(post_options);
    try {
    var post_req = http.request(post_options, function(post_res) {
        var content="";
        post_res.setEncoding('utf8');
	post_res.on('error',function (e) {
	    console.log(e);
	});
        post_res.on('data', function (chunk) {
            content += chunk;
        });
        post_res.on('end', function () {
           callback(JSON.parse(content));  
        });
/*
        post_res.on('data', function (chunk) {
            callback(JSON.parse(chunk)); 
	});
*/
    });

    post_req.on('error', function(e){
        console.log("post_req error:");
	console.log(e);
    });
    post_req.write(post_data);
    post_req.end();

    } catch (e) {
	console.log("http.request error:");
        console.log(e);
	callback(JSON.parse("[]"));
    }
    
}
