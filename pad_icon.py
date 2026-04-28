import sys
from PIL import Image

def pad_image(path):
    img = Image.open(path)
    
    # If image has an alpha channel, create a white background first
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        alpha = img.convert('RGBA').split()[-1]
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.paste(img, mask=alpha)
        img = bg.convert('RGB')
    else:
        img = img.convert('RGB')

    w, h = img.size
    
    # Target size with padding (40% larger than max dimension)
    target_size = int(max(w, h) * 1.4)
    
    new_img = Image.new("RGB", (target_size, target_size), (255, 255, 255))
    
    # Center paste
    x = (target_size - w) // 2
    y = (target_size - h) // 2
    new_img.paste(img, (x, y))
    
    # Resize to 1024x1024
    new_img = new_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    new_img.save(path, 'PNG')
    print(f"Padded {path}")

pad_image('frontend/assets/icon.png')
