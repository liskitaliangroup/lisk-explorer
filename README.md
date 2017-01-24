#Lisk Explorer
> With love by liskit delegate, for donation 10310263204519541551L

The script aims to explore the Lisk network saving all the open API nodes and checking for delegates forging on one of these nodes.
    
##Prereq

    - nodeJS
    - npm

##Install
Clone the repository and cd into it:

    - cp config.sample.json in config.json

Actually you can decide to don't edit the config.json because an open API node has been already set by default or you can simply use login.lisk.io. 

The force option is used into the collect.js script to decide if iterate btw all the public key collected or just btw the forging delegates public key. 

Install dependencies with:

    - npm Install

##Run
Run the script in 2 step

    - npm run-script discover (for collecting the nodes)
    - npm run-script collect (for collecting all the forging delegates using an open API node)
    
##Results
The script results are stored in json files.
