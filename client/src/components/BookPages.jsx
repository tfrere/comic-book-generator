import { Box } from "@mui/material";

const PAGE_COUNT = 4;

export const BookPages = () => {
  return (
    <>
      {/* Pages */}
      {[...Array(PAGE_COUNT)].map((_, index) => {
        const offset = PAGE_COUNT - index;
        const verticalOffset = offset * 1;
        return (
          <Box
            key={index}
            sx={{
              position: "absolute",
              top: `${verticalOffset}px`,
              bottom: `${verticalOffset}px`,
              left: `${20 + offset}px`, // Ajout d'une marge de base de 20px
              right: `${-offset}px`,
              background: "#888",
              borderRadius: "4px",
              boxShadow: "2px 4px 12px rgba(0,0,0,0.15)",
              border: "1px solid rgba(0,0,0,0.1)",
              zIndex: 0,
            }}
          />
        );
      })}
    </>
  );
};

export default BookPages;
