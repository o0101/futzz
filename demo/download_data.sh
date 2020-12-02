#!/bin/bash

while IFS= read -r line; do
  curl -L -O -J $line
  sleep 3
done < textfiles.archives.dat


