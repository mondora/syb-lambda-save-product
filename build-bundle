#!/usr/bin/env bash

#Download and install all dependencies
npm install
#Build src into bundle dir
npm run build
#Copy node_modules into bundle dir
cp package.json bundle/
cd bundle
# install prod dependencies
npm install --production
#Zip bundle files
zip -qr bundle.zip *
mv bundle.zip ../
#Clean directories
cd ..
rm -r bundle
