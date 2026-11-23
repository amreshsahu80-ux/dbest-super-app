#!/usr/bin/env python3
"""DBest electronics image acquisition. Run in a network-enabled CI runner.
Requires: pip install requests beautifulsoup4 pillow
Optional Supabase Storage upload: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
Never publishes products or overwrites existing catalogue records.
"""
import argparse,csv,hashlib,io,os,re,time
from urllib.parse import urlparse,urljoin
import requests
from bs4 import BeautifulSoup
from PIL import Image

UA={"User-Agent":"Mozilla/5.0 (compatible; DBestCatalogImageVerifier/1.0)"}
def fetch_image(session,url):
    p=urlparse(url)
    if p.scheme!="https" or not p.hostname or p.hostname in ("localhost","127.0.0.1"):
        raise ValueError("invalid HTTPS image URL")
    r=session.get(url,timeout=18,headers=UA)
    r.raise_for_status()
    if len(r.content)>8_000_000: raise ValueError("image too large")
    im=Image.open(io.BytesIO(r.content))
    im.verify()
    im=Image.open(io.BytesIO(r.content)).convert("RGB")
    if min(im.size)<200: raise ValueError("image too small")
    buf=io.BytesIO(); im.thumbnail((1200,1200)); im.save(buf,format="JPEG",quality=86)
    return buf.getvalue()
def page_image(session,page):
    if not page or not page.startswith("https://"): return None
    r=session.get(page,timeout=18,headers=UA);r.raise_for_status()
    soup=BeautifulSoup(r.text[:2_000_000],"html.parser")
    for attrs in ({"property":"og:image"},{"name":"twitter:image"}):
        tag=soup.find("meta",attrs=attrs)
        if tag and tag.get("content"):return urljoin(r.url,tag["content"])
    return None
def upload(session,data,key):
    base=os.environ["SUPABASE_URL"].rstrip("/")
    token=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    endpoint=f"{base}/storage/v1/object/marketplace-product-images/{key}"
    r=session.post(endpoint,data=data,headers={"Authorization":f"Bearer {token}","apikey":token,"Content-Type":"image/jpeg","x-upsert":"false"},timeout=35)
    r.raise_for_status()
    return f"{base}/storage/v1/object/public/marketplace-product-images/{key}"
def main():
    ap=argparse.ArgumentParser();ap.add_argument("input_csv");ap.add_argument("output_csv")
    ap.add_argument("--upload",action="store_true",help="Upload verified bytes to DBest Storage")
    a=ap.parse_args();s=requests.Session()
    with open(a.input_csv,newline="",encoding="utf-8-sig") as f:rows=list(csv.DictReader(f))
    if not rows or "product_name" not in rows[0]:raise ValueError("Expected expanded Electronics master CSV")
    for i,row in enumerate(rows):
        row.update(image_url="",image_kind="",image_source="",image_validation_status="",image_source_page=row.get("reference_product_page",""),image_rights_basis="",image_rights_verified="false")
        try:
            page=row.get("reference_product_page","")
            candidate=page_image(s,page)
            if not candidate:raise ValueError("no metadata image on product page")
            content=fetch_image(s,candidate)
            # Product pages may use generic category images. Mark for exact-model review.
            row["image_source"]=candidate
            row["image_kind"]="manufacturer_page_candidate"
            row["image_validation_status"]="image_bytes_valid_model_match_unverified"
            if a.upload:
                key="master-candidates/"+hashlib.sha256((row["product_name"]+candidate).encode()).hexdigest()+".jpg"
                row["image_url"]=upload(s,content,key)
                row["image_validation_status"]="uploaded_pending_model_and_rights_review"
        except Exception as e:
            row["image_validation_status"]="not_fetched: "+str(e)[:140]
        if (i+1)%25==0:print(f"processed {i+1}/{len(rows)}",flush=True)
        time.sleep(0.15)
    with open(a.output_csv,"w",newline="",encoding="utf-8") as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    print("Finished",len(rows),"records; images remain unapproved until model and rights verification.")
if __name__=="__main__":main()
