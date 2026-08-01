import React, { Component } from 'react'
import css from './Wideo.module.css'

export class VideoCard extends Component {
	render() {
		const { video, onClick } = this.props

		return (
			<div
				className={css.vid_card}
				onClick={() => onClick && onClick(video)}
			>
				<div className={css.vid_thumbWrap}>
					<img
						src={video.thumb}
						alt={video.title}
						className={css.vid_thumb}
						loading="lazy"
						onError={(e) => {
							e.target.style.background = '#222'
						}}
					/>
					<div className={css.play_icon}>▶</div>
				</div>
				<div className={css.vid_title}>{video.title}</div>
			</div>
		)
	}
}

export default VideoCard
