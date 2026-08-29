import {MouseEventHandler, SVGProps} from "react";

export default function ProviderButton({icon, onClickHandler}: {
    icon: SVGProps<SVGSVGElement>,
    onClickHandler: MouseEventHandler
}) {
    return (
        <button
            type={'button'}
            onClick={onClickHandler}
            className='btn btn-square btn-primary'>
            <>{icon}</>
        </button>
    )
}