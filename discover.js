var request = require ('request');
var config = require('./config.json');
var fs = require('fs');
var _ = require('lodash');
var colors = require('colors');

var startingNode = config.node;
var nodesVisited = {};
var nodeToVisit = [];
var totalOpenNodes = 0;
var totalClosedNodes = 0;

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
        return JSON.parse (fs.readFileSync('nodes.sample.json', 'utf8'));
    } catch (e) {
        console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red('Something wrong loading the nodes.sample.json'));
        return {
        };
    }
};

var nodesReport = loadNodesReport();
console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green('Crawl started\n'));


/*
 * Check if the node in config.json has open API to use as network entry point
*/

var isStartingWithOpenApiNode = function() {
    return new Promise(function (resolve, reject) {
        request.get('http://' + startingNode + '/api/peers?state=2&orderBy=version:desc',{timeout: 3500}, function(error, response, body) {
            if(!error && response.statusCode == 200) {
                resolve(true);
            } else {
                reject(false);
            }
        })
    })
}

isStartingWithOpenApiNode().then(function(res) {
    nodeToVisit.push(startingNode);
    nodesReport.start = new Date(Date.now()).toString();
    collectDelegatesPublicKey().then(function (res) {
        console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green(res));
        crawl();
    }, function (err) {
        console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
    })
}, function (err) {
    console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red('Please start the explorer with an open API Lisk node'));
});

/*
 * Crawling the network
*/

function crawl() {
    var nextNode = nodeToVisit.pop();
    if(nextNode != undefined) {
        if (nextNode in nodesVisited)
            crawl();
        else
            visitNode(nextNode, crawl);
    } else {
        /*
        * Crawling finished
        * */
        nodesReport.totalOpenNodes = totalOpenNodes;
        nodesReport.totalClosedNodes = totalClosedNodes;
        nodesReport.total = totalOpenNodes + totalClosedNodes;
        console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green('Nodes crawled'));
        /*
        * Collecting publicKeys
        * */
        //collectDelegatesPublicKey().then(function (res) {
            //console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green(res));
            /*
            * Searching and collecting for delegates using insecure nodes
            * */
            //collectInsecureNodeAndDelegates().then(function (res){
                //console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.green(res));
                /*
                * Saving the data
                * */
                nodesReport.finish = new Date(Date.now()).toString();
                saveNodesReport().then(function (res) {
                    console.log('\n' + res);
                }, function (err) {
                    console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
                })
            //}, function (err) {
                //console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
            //});
        //}, function (err) {
            //console.log('\n' + colors.magenta(new Date(Date.now()).toString()) + ' | ' + colors.red(err));
        //})
    }
}

function visitNode(node, callback) {
    nodesVisited[node] = true;
    console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' +colors.green('Node: ') + node);
    request.get('http://' + node + '/api/peers?state=2&orderBy=version:desc',{timeout: 3500}, function(error, response, body) {
        if(!error && response.statusCode == 200) {
            var res = JSON.parse(body);
            nodesReport.openNodes.push(node);
            totalOpenNodes++;
            for(var i = 0; i < res.peers.length; i++)
                nodeToVisit.push(res.peers[i].ip + ':' + res.peers[i].port);
            callback();
        } else {
            console.log(colors.magenta(new Date(Date.now()).toString()) + ' | ' +colors.red('Node dropped: ') + node);
            nodesReport.closedNodes.push(node);
            totalClosedNodes++
            callback();
            return;
        }
    })
};

/*
 * Collecting all the delegates public key in the nodes.json
*/

var browseDelegate = function (pageCounter) {
    return new Promise(function (resolve, reject) {
        request.get('http://' + startingNode + '/api/delegates/?limit=101&offset=' + pageCounter + '&orderBy=rate:asc', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var res = JSON.parse(body)
                if(res.delegates.length)
                   resolve(res);
            } else {
                reject('Error in /api/delegates/');
            }
        })
    });
};

function collectDelegatesPublicKey() {
    return new Promise( (resolve, reject) => {
        var pageCounter = 0;
        var numberOfDelegates = 0;
        this.resolveCounter = 0;
        browseDelegate(pageCounter).then((res) => {
               numberOfDelegates = res.totalCount;
               nodesReport.totalRegisteredDelegates = numberOfDelegates;
               for(pageCounter; pageCounter < numberOfDelegates; pageCounter += 101) {
                   browseDelegate(pageCounter).then((res) => {
                       var delegates = res;
                       for (var i = 0; i < delegates.delegates.length; i++) {
                           //console.log(delegates.delegates[i].username)
                           this.resolveCounter++;
                           if(delegates.delegates[i].rate <= 101){
                               nodesReport.forgingDelegatesPublicKey.push({
                                   "publicKey":delegates.delegates[i].publicKey,
                                   "username":delegates.delegates[i].username,
                               });
                           } else {
                               nodesReport.notForgingDelegatesPublicKey.push({
                                   "publicKey":delegates.delegates[i].publicKey,
                                   "username":delegates.delegates[i].username
                               });
                           }
                       }
                       if(this.resolveCounter == nodesReport.totalRegisteredDelegates)
                            resolve('Public keys collected: ' + this.resolveCounter);
                   }, function (err) {
                       reject(err);
                   });
               }
           }, function (err) {
               reject(err);
           });
       }
   );
}