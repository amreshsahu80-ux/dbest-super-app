#!/usr/bin/env python3
"""Build a verified Indian branded grocery image catalogue from Open Food Facts CSV/TSV export.
Usage: python3 scripts/build_india_grocery_catalog.py products.csv > grocery-india-images.json
Images are exact front-pack URLs; no guessed or generic image substitution.
"""
import csv,json,sys,re
from pathlib import Path
def norm(s): return re.sub(r'[^a-z0-9]+','',str(s or '').lower())
def main(path):
    with open(path,encoding='utf-8-sig',newline='') as f:
        sample=f.read(4096);f.seek(0)
        dialect=csv.excel_tab if '\t' in sample.splitlines()[0] else csv.excel
        reader=csv.DictReader(f,dialect=dialect)
        output=[];seen=set()
        for r in reader:
            get=lambda *names: next((r[k] for k in names if r.get(k)), '')
            code=get('code','barcode')
            name=get('product_name','product_name_en')
            brand=get('brands')
            qty=get('quantity')
            country=get('countries_tags','countries')
            url=get('image_front_url','image_front_small_url','image_url')
            if not (code and name and brand and qty and url):continue
            if 'india' not in country.lower() and 'en:india' not in country.lower():continue
            if not url.startswith('https://'):continue
            if code in seen:continue
            seen.add(code)
            output.append(dict(barcode=code,name=name,brand=brand,pack=qty,image_url=url,source='Open Food Facts',source_url='https://world.openfoodfacts.org/product/'+code))
    json.dump(dict(source='Open Food Facts',license_data='ODbL',license_images='CC BY-SA',products=output),sys.stdout,ensure_ascii=False)
if __name__=='__main__':
    if len(sys.argv)!=2:sys.exit('Usage: build_india_grocery_catalog.py <export.csv>')
    main(sys.argv[1])
