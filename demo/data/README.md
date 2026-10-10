# 标准颜色数据

原始 CIE 数据下载于 2026-10-09，来自 CIE 官方页面：

- CIE 1931 2° 标准观察者：https://cie.co.at/datatable/cie-1931-colour-matching-functions-2-degree-observer ，DOI 10.25039/CIE.DS.xvudnb9b。原 CSV MD5：17cca777db64b17170f06f67ce9d3ab7。
- D65 光源：https://cie.co.at/datatable/cie-standard-illuminant-d65 ，DOI 10.25039/CIE.DS.hjfjmt59。原 CSV MD5：03d4eb9b837c60671627c946fb534deb。

作者：International Commission on Illumination (CIE)，2019。

许可：CC BY-SA 4.0，https://creativecommons.org/licenses/by-sa/4.0/ 。此文件夹的原始 CSV 与其重采样衍生数据 `../color-data.js` 按相同许可提供。衍生数据的修改：从原始 1 nm 数据中选取 380–780 nm、10 nm 间隔值。

这里的标准观察者和光源数据是真实标准数据；原型内置颜料反射率由公式合成，二者不能混为一谈。光谱积分采用等间隔离散求和，以完美漫反射体的 Y 归一化。10 nm 采样为数值近似。

`ciede2000-reference.txt` 来自 G. Sharma、W. Wu、E. N. Dalal (2005) 的作者补充测试数据，仅用于核验色差公式：https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/ 。`profile-test6.json`、`profile-test6.csv` 和 `verification-input.png` 是本项目合成的验证样本，不是真实材料数据。
