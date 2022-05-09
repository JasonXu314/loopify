import { SVGAttributes } from 'react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';

const DragIcon: React.FC<SVGAttributes<SVGElement> & { dragProps?: DraggableProvidedDragHandleProps }> = ({ dragProps, ...rest }) => {
	return (
		<div {...dragProps}>
			<svg
				{...rest}
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="black"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round">
				<line x1="18" y1="12" x2="6" y2="12"></line>
				<line x1="21" y1="6" x2="3" y2="6"></line>
				<line x1="21" y1="18" x2="3" y2="18"></line>
			</svg>
		</div>
	);
};

export default DragIcon;
