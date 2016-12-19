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

if(config.force) {
    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.yellow('Using all delegates public keys? ' + config.force));
} else {
    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green('Using all delegates public keys? ' + config.force));

}

function checkIfNodeIsForging (node) {
    return new Promise( (resolve, reject) => {
        // loading forging delegates public keys

        if(config.force) {
            var publicKeys = nodesReport.forgingDelegatesPublicKey.concat(nodesReport.notForgingDelegatesPublicKey);
        } else {
            var publicKeys = nodesReport.forgingDelegatesPublicKey;
        }

        // for each publickey check if it is forging on the given node
        var promises = [];
        publicKeys.forEach (function (publicKey) {
            promises.push (checkIfForgingIsEnabledByDelegate(node, publicKey.publicKey, publicKey.username));
        });

        Promise.all (promises).then ((r) => {
            r.forEach (function (rr) {
                if (rr.found == true)
                    resolve (rr);
            });
            resolve ({found: false})
        }).catch ((e) => {
            resolve ({found: false})
        });
    });
}



function collect () {
    // loading next node
    var nextNode = nodes.pop();

    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green('Asking to: ' + nextNode));
    console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green('Nodes remaining: ' + nodes.length));

    // if next node is still defined
    if(nextNode != undefined) {

        // ask to that node to check if one of the 101 delegates public key is used for forging
        checkIfNodeIsForging(nextNode).then((res) => {
            // if correlation found push the object into the collector
            if(res.found) {
                console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green('Correlation found: ' + res.username + ' ----> ' + res.node));
                nodesReport.insecureForgingNodes.push(res);
                collect();
            } else {
                console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.yellow('No correlation found'));
                collect();
            }

        }).catch ((err) => {

            // should not be trigger
            console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red('Error caught'));
        })

    } else {
        // saving data into json file
        console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green('Collect finished'));
        nodesReport.finishCollect = new Date(Date.now()).toString();
        saveNodesReport().then(function (res) {
            console.log('\n' + res);
        }, function (err) {
            console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
        });
    }
}