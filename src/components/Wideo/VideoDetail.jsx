import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import css from './Wideo.module.css'

export class VideoDetail extends Component {
	render() {
		const { video, relatedProduct } = this.props

		if (!video) return null

		return (
			<div className={css.video_detail}>
				<h2 className={css.video_detail_title}>{video.title}</h2>

				<img
					src={video.thumb}
					alt={video.title}
					className={css.video_preview}
					onError={(e) => {
						e.target.style.background = '#222'
					}}
				/>

				<p className={css.video_description}>
					<strong>Opis:</strong> {video.description}
				</p>
				<p className={css.video_description}>
					<strong>Szczegóły:</strong> {video.content}
				</p>

				<a
					className={css.btn_youtube}
					href={video.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					Obejrzyj na YouTube
				</a>

				{relatedProduct && (
					<div className={css.related_product}>
						<h3 className={css.related_heading}>Produkt z filmu</h3>
						<div className={css.related_card}>
							<img
								src={relatedProduct.img}
								alt={relatedProduct.name}
								className={css.related_img}
							/>
							<div className={css.related_info}>
								<span className={css.related_brand}>
									{relatedProduct.brand}
								</span>
								<span className={css.related_name}>
									{relatedProduct.name}
								</span>
								<span className={css.related_price}>
									{relatedProduct.price} zł
								</span>
								<Link to="/katalog" className={css.btn_more}>
									Zobacz w katalogu
								</Link>
							</div>
						</div>
					</div>
				)}
			</div>
		)
	}
}

export default VideoDetail
