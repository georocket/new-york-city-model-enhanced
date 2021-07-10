# Enhanced New York City 3D Building Model

This repository contains an enhanced version of the
[NYC 3D Building Model](https://www1.nyc.gov/site/doitt/initiatives/3d-building.page)
provided by the City of New York. It has been combined with the
[PLUTO data file](https://www1.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page)
(Primary Land Use Tax Lot Output) and now contains up to 90 semantic
attributes per building. The file format is CityGML.

**Important:** This data set is provided "as is" for informational purpose only.
Since it is relatively large and contains many buildings with many attributes,
it can also be quite useful for software performance testing. However, it should
not be used for productive use cases. The two source data sets have been linked
using the geospatial location of each building. Due to this, there might be a
small percentage of errors (e.g. missing information, duplicate information, or
attributes that have been attached to the wrong building) in the enhanced data set.

## Recreating/updating the data set

The repository contains a small Node.js program that can be used to recreate
the data set from scratch. The program reads a CityGML file from the original
NYC 3D Building Model data set and combines it with a PLUTO data file.

First, download the CityGML files and the PLUTO data file:

    wget http://maps.nyc.gov/download/3dmodel/DA_WISE_GML.zip
    unzip DA_WISE_GML.zip
    wget https://www1.nyc.gov/assets/planning/download/zip/data-maps/open-data/nyc_pluto_20v5_csv.zip
    unzip nyc_pluto_20v5_csv.zip

Now, run:

    npm i
    ./index.js --input source_file.gml --output output_file.gml --pluto nyc_pluto_20v5_csv/pluto.csv

Replace `source_file.gml` and `output_file.gml` with the names of the source and
destination CityGML files respectively.

In order to convert a whole directory:

    mkdir DA_WISE_GML_enhanced
    find ./DA_WISE_GML -type f -name '*.gml' -exec bash -exc './index.js --input {} --output ./DA_WISE_GML_enhanced/$(basename {}) --pluto nyc_pluto_20v5_csv/pluto.csv' \;

## Terms of use

The data set is provided free of charge. It can be used for informational purpose subject to the following conditions:

A link to this repository, the original source data sets from the City of New York, and this permission notice shall be included in all copies or substantial portions of the Software.

Files are provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.

The data set is based on the the
[NYC 3D Building Model](https://www1.nyc.gov/site/doitt/initiatives/3d-building.page)
and the
[PLUTO data file](https://www1.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page)
Terms of use and conditions from NYC.gov (http://www1.nyc.gov/home/terms-of-use.page) apply.
As provider of the original data sets, the City of New York remains owner of the data.
