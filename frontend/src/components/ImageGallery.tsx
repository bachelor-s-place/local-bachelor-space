import React, { useState } from 'react';
import styles from './ImageGallery.module.css';

interface ImageGalleryProps {
  propertyType: string;
}

export default function ImageGallery({ propertyType }: ImageGalleryProps) {
  // Hardcoded placeholder images for layout purposes until backend supports image uploads
  const images = propertyType === 'pg' 
    ? [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',
      ]
    : [
        'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=1200&q=80',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
        'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=80',
      ];

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const openLightbox = (index: number) => {
    setActiveImageIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <>
      <div className={styles.galleryGrid}>
        {/* Main large image */}
        <div className={styles.mainImageWrapper} onClick={() => openLightbox(0)}>
          <img src={images[0]} alt="Property Main" className={styles.image} />
        </div>
        
        {/* Smaller side images */}
        <div className={styles.sideImages}>
          <div className={styles.sideImageWrapper} onClick={() => openLightbox(1)}>
            <img src={images[1]} alt="Property 2" className={styles.image} />
          </div>
          <div className={styles.sideImageWrapper} onClick={() => openLightbox(2)}>
            <img src={images[2]} alt="Property 3" className={styles.image} />
          </div>
          <div className={styles.sideImageWrapper} onClick={() => openLightbox(3)}>
            <img src={images[3]} alt="Property 4" className={styles.image} />
            <div className={styles.overlay}>
              <span>View all photos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <button className={styles.closeBtn} onClick={closeLightbox}>✕</button>
          <img 
            src={images[activeImageIndex]} 
            alt="Property Fullscreen" 
            className={styles.lightboxImage} 
            onClick={(e) => e.stopPropagation()} // Prevent click from closing
          />
          <div className={styles.thumbnails}>
            {images.map((img, idx) => (
              <div 
                key={idx} 
                className={`${styles.thumbnailWrapper} ${idx === activeImageIndex ? styles.activeThumbnail : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
              >
                <img src={img} alt={`Thumbnail ${idx}`} className={styles.thumbnail} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
