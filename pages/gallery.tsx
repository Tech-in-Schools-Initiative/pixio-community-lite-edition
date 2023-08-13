import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';
import { saveAs } from 'file-saver';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import DownloadIcon from '@material-ui/icons/GetApp';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Skeleton from '@material-ui/lab/Skeleton';

function Header() {
  return (
    <div className="header" style={{display: 'flex', justifyContent: 'center', textAlign: 'center'}}>
      <h2 style={{fontSize: '2em', fontWeight: 'bold', color: 'red'}}>Pixio Gallery</h2>
    </div>
  );
}

function ImageCard({ url, text, onClick }) {
  const [isLoading, setIsLoading] = useState(true);

  const limitText = (text, maxLength = 50) => {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  return (
    <div 
      className="image-container" 
      title={limitText(text)} 
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '5px',
        height: '250px',
        width: '250px',
        margin: '5px'
      }}
    >
      {isLoading ? (
        <Skeleton variant="rect" width={250} height={250} />
      ) : null}
      <img 
        src={url} 
        className="image" 
        onClick={onClick}
        onLoad={() => setIsLoading(false)}
        style={{
          borderRadius: '10%',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: isLoading ? 'none' : 'block',
        }}
      />
    </div>
  );
}

// Create a PageNumber component
function PageNumber({ currentPage }) {
  return (
    <button 
      style={{ 
        padding: '10px', 
        borderRadius: '5px', 
        backgroundColor: '#448AFF', 
        color: '#fff',
        marginTop: '6px',
        height: '43px',
        cursor: 'default'
         // Prevents the button from appearing clickable 
      }} 
      disabled
    >
      Page: {currentPage}
    </button>
  );
}
// Update the Pagination component
function Pagination({ currentPage, onPageChange, disablePrev, disableNext }) {
  const isMobile = useMediaQuery('(max-width:600px)'); // Detects mobile screen

  const handleClick = () => {
    window.location.href = "/";
  };

  // Adjusts flex direction based on the screen size
  const buttonContainerStyle = isMobile ?
    { marginBottom: '10px', display: 'flex', flexWrap: 'wrap' as 'wrap', justifyContent: 'space-around', width: '100%' } :
    { marginBottom: '10px', display: 'flex', justifyContent: 'space-between', width: '96%' };

  return (
    <div style={buttonContainerStyle}>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={disablePrev} style={{ margin: '5px', padding: '10px', borderRadius: '5px', backgroundColor: disablePrev ? '#9E9E9E' : '#448AFF', color: '#fff' }}>Previous Page</button>
      <button className="button" onClick={handleClick} style={{ margin: '5px', padding: '10px', borderRadius: '5px', backgroundColor: '#448AFF', color: '#fff' }}>Image Generator</button>
      <PageNumber currentPage={currentPage} />
      <button onClick={() => onPageChange(currentPage + 1)} disabled={disableNext} style={{ margin: '5px', padding: '10px', borderRadius: '5px', backgroundColor: disableNext ? '#9E9E9E' : '#448AFF', color: '#fff' }}>Next Page</button>
    </div>
  );
}

export default function Gallery() {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [pages, setPages] = useState<{ [index: number]: { url: string; text: string }[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    const response = await axios.get(`/api/discord-images?page=${page}`);
    setPages(prevPages => ({ ...prevPages, [page]: response.data }));
    setIsLoading(false);
  }, [page]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages, page]);

  const currentPageImages = pages[page] || [];

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '90%', margin: '0 auto' }}>
      <Header />
      <Pagination currentPage={page} onPageChange={setPage} disablePrev={page === 1} disableNext={isLoading || currentPageImages.length === 0} />
      
      <div 
        className="gallery" 
        style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr 1fr', // Adjust the number of columns based on your requirement
            gap: '10px',
            justifyContent: 'center'
            
          }}
      >

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></div>
        ) : currentPageImages.length === 0 ? (
          <div>No images for this page.</div>
        ) : currentPageImages.map((image, index) => (
          <ImageCard key={index} url={image.url} text={image.text} onClick={() => {setIsOpen(true); setPhotoIndex(index);}} />
        ))}
      </div>

      <Pagination currentPage={page} onPageChange={setPage} disablePrev={page === 1} disableNext={isLoading || currentPageImages.length === 0} />
      
      {isOpen && currentPageImages && (
        <Lightbox
          mainSrc={currentPageImages[photoIndex].url}
          nextSrc={currentPageImages[(photoIndex + 1) % currentPageImages.length].url}
          prevSrc={currentPageImages[(photoIndex + currentPageImages.length - 1) % currentPageImages.length].url}
          onCloseRequest={() => setIsOpen(false)}
          onMovePrevRequest={() =>
            setPhotoIndex((photoIndex + currentPageImages.length - 1) % currentPageImages.length)
          }
          onMoveNextRequest={() =>
            setPhotoIndex((photoIndex + 1) % currentPageImages.length)
          }
          toolbarButtons={[
            <IconButton
              onClick={() => saveAs(currentPageImages[photoIndex].url, "downloadedImage.jpg")}
              aria-label="Download image"
              color="primary"
            >
              <DownloadIcon />
            </IconButton>
          ]}
        />
      )}
    </div>
  );
}