import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import { GALLERY_CONFIG } from "../../config";
import CommunityCardNode from "./CommunityCardNode";
import type { GenerationDetails } from "../../types";

/**
 * @typedef {object} DynamicCommunityGalleryProps
 * @property {GenerationDetails[]} items - The array of community gallery items.
 * @property {(item: GenerationDetails) => void} onItemSelect - Callback for when an item is selected.
 * @property {(e: React.MouseEvent<HTMLButtonElement>, id: string) => void} onVote - Callback for voting.
 * @property {boolean} isInBackground - Whether the gallery is in the background.
 */
interface DynamicCommunityGalleryProps {
  items: GenerationDetails[];
  onItemSelect: (item: GenerationDetails) => void;
  onVote: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
  isInBackground: boolean;
}

/**
 * Creates a dynamic, interactive 3D grid of community gallery cards.
 * This component is responsible for calculating the grid layout and rendering the individual card nodes.
 * @param {DynamicCommunityGalleryProps} props - The component props.
 * @returns {JSX.Element} A three.js group containing all the card nodes.
 */
const DynamicCommunityGallery: React.FC<DynamicCommunityGalleryProps> = ({
  items,
  onItemSelect,
  onVote,
  isInBackground,
}) => {
  const { viewport } = useThree();

  const grid = useMemo(() => {
    console.group("DynamicCommunityGallery Grid Calculation");

    if (!items.length || viewport.width === 0) {
      console.log("No items or viewport width is zero, aborting calculation.");
      console.groupEnd();
      return [];
    }

    const itemCount = items.length;
    const { width, height } = viewport;
    console.log(`Viewport Dimensions: ${width.toFixed(2)}w x ${height.toFixed(2)}h`);
    console.log(`Total Items: ${itemCount}`);
    
    const gridItems = [];
    const tempPoints: Vector2[] = [];
    const hexSize =
      Math.sqrt((width * height) / (itemCount * 1.5 * Math.sqrt(3))) /
      GALLERY_CONFIG.GRID_DENSITY;
    const hexWidth = Math.sqrt(3) * hexSize;
    const hexHeight = 2 * hexSize;
    const cols = Math.ceil(width / hexWidth);
    const VERTICAL_SPACING_DIVISOR = 4 / 3;
    const verticalSpacing = hexHeight / VERTICAL_SPACING_DIVISOR;
    
    // --- FIXED: The 'rows' variable was used before it was defined. ---
    const rows = Math.ceil(height / verticalSpacing);

    for (let row = 0; row < rows + 2; row++) {
      for (let col = 0; col < cols + 2; col++) {
        tempPoints.push(
          new Vector2(
            col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0),
            row * verticalSpacing
          )
        );
      }
    }
    
    const pointsToConsider = tempPoints.slice(0, itemCount);
    const center = pointsToConsider
      .reduce((acc, p) => acc.add(p), new Vector2(0, 0))
      .multiplyScalar(1 / (itemCount || 1));

    const GRID_COMPRESSION_FACTOR = 0.8;

    for (let i = 0; i < itemCount; i++) {
      const point = tempPoints[i];
      const baseSize = (hexWidth / Math.sqrt(3)) * 1.1;
      const homePosition = [
          (point.x - center.x) * GRID_COMPRESSION_FACTOR - hexWidth / 8,
          (point.y - center.y) * GRID_COMPRESSION_FACTOR,
          0,
      ] as [number, number, number];

      // --- ADDED: Log the position being assigned to the first 5 cards ---
      if (i < 5) {
          console.log(`[Props] Assigning to Card ${items[i].id} homePosition:`, homePosition);
      }

      gridItems.push({
        index: i,
        item: items[i],
        homePosition: homePosition,
        baseSize: baseSize,
      });
    }
    
    console.groupEnd();

    return gridItems;
  }, [items, viewport.width, viewport.height]);

  return (
    <group>
      {grid.map((gridItem) => (
        <CommunityCardNode
          key={gridItem.item.id}
          item={gridItem.item}
          homePosition={gridItem.homePosition}
          baseSize={gridItem.baseSize}
          onItemSelect={onItemSelect}
          onVote={onVote}
          isInBackground={isInBackground}
        />
      ))}
    </group>
  );
};

export default DynamicCommunityGallery;