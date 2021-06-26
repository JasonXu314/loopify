import styles from './PlaceholderTile.module.scss';

interface Props {
	id: string | null;
}

const PlaceholderTile: React.FC<Props> = ({ id }) => {
	if (id === null) {
		return (
			<div className={styles.main}>
				<div className={styles.left}>
					<div className={styles['placeholder-h4']} />
				</div>
			</div>
		);
	}
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
