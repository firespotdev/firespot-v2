import { Oval } from 'react-loader-spinner'

const Spinner = () => {
  return (
    <Oval
      height={18}
      width={18}
      color="#0075FF"
      visible={true}
      ariaLabel="oval-loading"
      secondaryColor="white"
      strokeWidth={6}
      strokeWidthSecondary={3}
    />
  )
}

export { Spinner }
