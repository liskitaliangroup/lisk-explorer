/**
 * Created by andreafspeziale on 14/12/16.
 */

var request = require ('request');
var config = require('./config.json');
var fs = require('fs');
var _ = require('lodash');
var colors = require('colors');

var saveNodesReport = function () {
    return new Promise(function (resolve, reject) {
        fs.writeFile('nodes.json', JSON.stringify (nodesReport, null, 4), function (err,data) {
            if(!err)
                resolve(colors.magenta(new Date(Date.now()).toString()) + ' | ' +colors.green('Data saved'));
            else
                reject('Something wrong saving the delegate data');
        });
    })
};
var loadNodesReport = function () {
    try {
        return JSON.parse (fs.readFileSync('nodes.json', 'utf8'));
    } catch (e) {
        console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red('Something wrong loading the nodes.json'));
        return {
        };
    }
};

var nodesReport = loadNodesReport();

nodesReport.startCollect = new Date(Date.now()).toString();

/**
 * Ensuring to empty collection and re-collecting
 */

nodesReport.insecureForgingNodes = [];

saveNodesReport().then(function (res) {
    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | '+ colors.green('insecureForgingNodes reinitialized'));
    collectInsecureNodeAndDelegates().then(function (res){
        nodesReport.totalForgingDelegatesWithOpenAPI = nodesReport.insecureForgingNodes.length;
        console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green(res));
        /*
         * Saving the data
         * */
        nodesReport.finishCollect = new Date(Date.now()).toString();
        saveNodesReport().then(function (res) {
            console.log('\n' + res);
        }, function (err) {
            console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
        })
    }, function (err) {
        console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
    });
}, function (err) {
    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
})

/*
 * Check if an open node is forging and connect it to the delegate who enabled it
 */
function checkIfForgingIsEnabledByDelegate(node, publicKey, username) {
    //console.log(node,publicKey);
    return new Promise( (resolve, reject) => {
        request.get('http://' + node + '/api/delegates/forging/status?publicKey=' + publicKey,{timeout: 5500}, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                var res = JSON.parse(body);
                if(res.success && res.enabled) {
                    resolve({
                        found: true,
                        node: node,
                        publicKey: publicKey,
                        username: username
                    });
                } else {
                    resolve({
                        found: false,
                        node: node,
                        publicKey: publicKey
                    });
                }
            } else {
                reject({
                    found: false,
                    node: node,
                    publicKey: publicKey,
                    message: "Error in /api/delegates/forging/status?publicKey call"
                });
            }
        })
    });
};

function collectInsecureNodeAndDelegates() {
    return new Promise( (resolve, reject) => {

        this.counter = 0;
        this.nodeLimit = nodesReport.openNodes.length;
        if(config.force)
            this.publicKeyLimit = (nodesReport.forgingDelegatesPublicKey.concat(nodesReport.notForgingDelegatesPublicKey)).length;
        else
            this.publicKeyLimit = nodesReport.forgingDelegatesPublicKey.length;
        this.fails = [];



        for(var i = 0; i < this.publicKeyLimit;  i++) {

            for(var j = 0; j < this.nodeLimit; j++) {

                /*if(this.fails.indexOf(nodesReport.openNodes[j]) == -1)
                    this.fails.push(nodesReport.openNodes[j]);*/

                checkIfForgingIsEnabledByDelegate(nodesReport.openNodes[j], nodesReport.forgingDelegatesPublicKey[i].publicKey, nodesReport.forgingDelegatesPublicKey[i].username).then( (res) => {


                    /*if(this.fails.indexOf(res.node) != -1)
                        this.fails.push(res.node);*/

                    //console.log('success ',this.counter);

                    this.counter = this.counter + 1;
                    if (res.found) {
                        nodesReport.insecureForgingNodes.push({
                            "node": res.node,
                            "publicKey": res.publicKey,
                            "username": res.username
                        })
                    }

                    if(this.counter == (this.nodeLimit * this.publicKeyLimit)-1){
                        resolve('Insecure delegate crawled. API call performed: ' + this.counter + ' Call failed ' + this.fails.length );
                    }

                }, (err) => {

                    //console.log(err.message);

                    this.counter = this.counter + 1;

                    this.fails.push(err);

                    if(this.counter == (this.nodeLimit * this.publicKeyLimit)-1)
                        resolve('Insecure delegate crawled. API call performed: ' + this.counter + ' Call failed  ' + this.fails.length);
                });

            }
        }
    });
};