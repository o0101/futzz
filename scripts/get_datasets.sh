#!/bin/bash

echo
echo "Will download some big datasets for testing..."
echo

read -p "Are you sure? " -n 1 -r
echo    
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo
  echo "OK, downloading..."
  echo
  curl -o samples/t2.txt -L http://www.scifiscripts.com/scripts/t2.txt
  curl -o samples/do.txt -L http://www.gutenberg.org/cache/epub/8086/pg8086.txt
else
  echo
  exit 0
fi

