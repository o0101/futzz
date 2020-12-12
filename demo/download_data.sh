#!/bin/bash


#while IFS= read -r line; do
#  curl -L -O -J $line
#  sleep 3
#done < textfiles.archives.dat

mkdir ir-data
cd ir-data

mkdir cran
cd cran
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/cran/cran.tar.gz
tar -xvzf cran.tar.gz
cd ..


mkdir cisi
cd cisi
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/cisi/cisi.tar.gz
tar -xvzf cisi.tar.gz
cd ..

mkdir lisa
cd lisa
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/lisa/lisa.tar.gz
tar -xvzf lisa.tar.gz
cd ..

mkdir npl
cd npl
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/npl/npl.tar.gz
tar -xvzf npl.tar.gz
cd ..

mkdir cacm
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/cacm/cacm.tar.gz
tar -xvzf cacm.tar.gz
cd ..

mkdir time
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/time/time.tar.gz
tar -xvzf time.tar.gz

mkdir medline
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/medl/med.tar.gz
tar -xvzf med.tar.gz
cd ..

mkdir adi
curl -O -J -L http://ir.dcs.gla.ac.uk/resources/test_collections/adi/adi.tar.gz
tar -xvzf adi.tar.gz
cd ..

mkdir reuters
curl -O -J -L http://kdd.ics.uci.edu/databases/reuters21578/reuters21578.tar.gz
tar -xvzf returers21578.tar.gz
cd ..




