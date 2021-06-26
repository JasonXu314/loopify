import { InputHTMLAttributes } from 'react';
import styles from './Input.module.scss';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
	onEnter?: () => void;
}

const Input: React.FC<Props> = ({ id, label, onEnter, ...rest }) => {
	return (
		<div className={styles.main}>
			<input
				{...rest}
				className={styles.input + (rest.value !== '' ? ' ' + styles.contentful : '')}
				type="text"
				name={id}
				onKeyPress={(evt) => {
					if (evt.key === 'Enter' && onEnter) {
						onEnter();
					}
				}}
			/>
			<label className={styles.label} htmlFor={id}>
				{label}
			</label>
		</div>
	);
};

export default Input;
