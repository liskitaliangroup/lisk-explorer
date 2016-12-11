var request = require ('request');
var config = require('./config.json');
var fs = require('fs');
var _ = require('lodash');

var startingNode = config.node;
var nodesVisited = {};
var nodeToVisit = [];
var totalOpenNodes = 0;
var totalClosedNodes = 0;
var total = 0;

var saveNodesReport = function () {
    return new Promise(function (resolve, reject) {
        fs.writeFile('nodes.json', JSON.stringify (nodesReport, null, 4), function (err,data) {
            if(!err)
                resolve(new Date(Date.now()).toString() + ' | Data saved');
            else
                reject(new Date(Date.now()).toString() + ' | Something wrong saving the delegate data');
        });
    })
};
var loadNodesReport = function () {
    try {
        return JSON.parse (fs.readFileSync('nodes.json', 'utf8'));
    } catch (e) {
        console.log(new Date(Date.now()).toString() + ' | Something wrong loading the nodes.json');
        return {
        };
    }
};

var nodesReport = loadNodesReport();
console.log(new Date(Date.now()).toString() + ' | Crawl started\n');

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
    crawl();
}, function (err) {
    console.log(new Date(Date.now()).toString() + ' | Please start the explorer with an open API Lisk node');
});



function crawl() {
    var nextNode = nodeToVisit.pop();
    if(nextNode != undefined) {
        if (nextNode in nodesVisited)
            crawl();
        else
            visitNode(nextNode, crawl);
    } else {
        nodesReport.finish = new Date(Date.now()).toString();
        nodesReport.totalOpenNodes = totalOpenNodes;
        nodesReport.totalClosedNodes = totalClosedNodes;
        nodesReport.total = totalOpenNodes + totalClosedNodes;
        saveNodesReport().then(function (res) {
            console.log('\n' + res);
        }, function (err) {
            console.log(err);
        })
    }
}

function visitNode(node, callback) {
    nodesVisited[node] = true;
    console.log(new Date(Date.now()).toString() + ' | Node: ' + node);
    request.get('http://' + node + '/api/peers?state=2&orderBy=version:desc',{timeout: 3500}, function(error, response, body) {
        if(!error && response.statusCode == 200) {
            var res = JSON.parse(body);
            nodesReport.openNodes.push(node);
            totalOpenNodes++;
            for(var i = 0; i < res.peers.length; i++)
                nodeToVisit.push(res.peers[i].ip + ':' + res.peers[i].port);
            callback();
        } else {
            console.log(new Date(Date.now()).toString() + ' | Node dropped: ' + node);
            nodesReport.closedNodes.push(node);
            totalClosedNodes++
            callback();
            return;
        }
    })
};
