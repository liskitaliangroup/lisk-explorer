#Lisk-explorer
This 2 script aims to 

    - explorer a big part of the Lisk network saving all the IP with open API
    - check if some delegate is forging on a open API node
    

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
    
##Trouble
If you run into some javascript memory error launch the script manually like this:

    - node --max_old_space_size=6144 discover.js
    
Of course you need a machine with such memory available.
