/**
 * Created by andreafspeziale on 14/12/16.
 */

var request = require ('request');
var config = require('./config.json');
var fs = require('fs');
var _ = require('lodash');
var colors = require('colors');

/**
 * Save the collect report into the report json
 * @returns {Promise}
 */

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

/**
 * Load the report generated from the discover script
 * @returns {{}}
 */
var loadNodesReport = function () {
    try {
        return JSON.parse (fs.readFileSync('nodes.json', 'utf8'));
    } catch (e) {
        console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red('Something wrong loading the nodes.json'));
        return {
        };
    }
};


// loading report
var nodesReport = loadNodesReport();

// setting the collect report start to now
nodesReport.startCollect = new Date(Date.now()).toString();

// nodes to ask if a public key is forging into
var nodes = [];
nodes = nodes.concat(nodesReport.openNodes);

// ensuring to empty the insecureForgingNodes collection and re-generate it with the next launch
nodesReport.insecureForgingNodes = [];

// success and fails collector
var success = [];
var fails = [];

//insecureForgingNodes reinitializing
saveNodesReport().then(function (res) {
    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | '+ colors.green('insecureForgingNodes reinitialized'));
    collect();
}, function (err) {
    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
})

/**
 * Check if an open node is forging and return the response
 */
function checkIfForgingIsEnabledByDelegate(node, publicKey, username) {
    //console.log('API CALL ', node, publicKey, username);

    return new Promise( (resolve, reject) => {

        request.get('http://' + node + '/api/delegates/forging/status?publicKey=' + publicKey,{timeout: 5500}, (error, response, body) => {

            if (!error && response.statusCode == 200) {

                //console.log('API CALL SUCCESS');

                var res = JSON.parse(body);

                resolve({
                    found: res.enabled,
                    node: node,
                    publicKey: publicKey,
                    username: username
                });

            } else {

                //console.log('API CALL FAIL');

                reject({
                    found: false,
                    node: node,
                    publicKey: publicKey,
                    error: error
                });
            }
        })
    });
};

function checkIfNodeIsForging (node) {
    return new Promise( (resolve, reject) => {
        // cycle counter
        var counter = 0;

        // loading forging delegates public keys
        var publicKeys = nodesReport.forgingDelegatesPublicKey;

        // for each publickey check if it is forging on the given node
        for(var i = 0; i < publicKeys.length; i++) {

            checkIfForgingIsEnabledByDelegate(node, publicKeys[i].publicKey, publicKeys[i].username).then((res) => {

                // iteration counter
                counter++;

                // collecting response
                success.push(res);

                // resolving the promise if I found a correlation
                if(res.found) {

                    console.log('CORRELATION FOUND');

                    resolve({
                        found:true,
                        node:res.node,
                        publicKye: res.publicKey,
                        username: res.username
                    });
                }

                // resolving the promise if I finish the iterations
                if(counter == (publicKeys.length)) {

                    console.log('ITERATION FINISHED IN SUCCESS');

                    resolve({
                        found:false,
                    });
                }

            }, (err) => {

                this.counter = this.counter + 1;

                fails.push(err);

                // if any error occur no block the iteration and resolve when finish
                if(counter == (publicKeys.length)) {

                    console.log('ITERATION FINISHED IN ERROR');

                    resolve({
                        found:false
                    });

                }
            });
        }
    })
}



function collect () {

    // loading next node
    var nextNode = nodes.pop();

    // if next node is still defined
    if(nextNode != undefined) {

        //console.log('nodes: ' + nodes);
        console.log('nodes len: ' + nodes.length);

        // ask to that node to check if one of the 101 delegates public key is used for forging
        checkIfNodeIsForging(nextNode).then((res) => {

            // printing response
            console.log('Collect success');

            // if correlation found push the object into the collector
            /*if(res.found) {
                nodesReport.insecureForgingNodes.push(res);
                collect();
            }*/

            collect();

        }, (err) => {

            // should not be trigger
            console.log('Collect error' + err);
        })

    } else {
        //finish
        console.log('I am in the else probably finished');
    }
}
