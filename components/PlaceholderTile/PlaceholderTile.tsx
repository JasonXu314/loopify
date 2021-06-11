import styles from './PlaceholderTile.module.scss';

interface Props {
	id: string;
}

const PlaceholderTile: React.FC<Props> = ({ id }) => {
	return (
		<div className={styles.main}>
			<div className={styles.left}>
				<h4>Processing video with id {id}</h4>
			</div>
			<div className={styles.right}>
				<img className={styles.loading} src="/gear.gif" alt="loading..." />
			</div>
		</div>
	);
};

export default PlaceholderTile;
