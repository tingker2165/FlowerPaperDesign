import urllib.request,hashlib,json,csv
from pathlib import Path
base=Path('demo/data')
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
for name,expected in [('CIE_xyz_1931_2deg.csv','17cca777db64b17170f06f67ce9d3ab7'),('CIE_std_illum_D65.csv','03d4eb9b837c60671627c946fb534deb')]:
    b=opener.open('https://files.cie.co.at/Publications-datasets/'+name,timeout=20).read()
    assert hashlib.md5(b).hexdigest()==expected
    (base/name).write_bytes(b)
    print(name,'checksum verified')

