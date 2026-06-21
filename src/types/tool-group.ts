/**
 * Available tool groups/categories:
 * - 'hexcolor': Hex color fill tool
 * - 'bucket': Hex color bucket fill tool
 * - 'eraser': Eraser tool
 * - 'text': Text annotation tool
 * - 'pattern': Stamp pattern tool
 * - 'pickPattern': Pick pattern tool
 * - 'river': River drawing tool
 * - 'road': Road drawing tool
 * - 'border': Border drawing tool
 * - 'selectPathAndBorder': Select path and border tool
 */
export type ToolGroup = 'brush' | 'bucket' | 'eraser' | 'text' | 'pattern' | 'pickPattern' | 'river' | 'road' | 'border' | 'selectPathAndBorder';

/**
 * Returns true if the provided tool group is a painting tool (brush, bucket, or eraser).
 */
export function isPaintingTool(toolGroup: ToolGroup) {
    return toolGroup === 'brush' || toolGroup === 'bucket' || toolGroup === 'eraser';
}