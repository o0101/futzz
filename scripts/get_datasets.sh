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
else
  echo
  exit 0
fi

